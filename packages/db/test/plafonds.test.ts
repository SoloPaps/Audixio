import { randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

let admin: Sql;
let local: LocalSupabase;
let unlock: (() => Promise<void>) | undefined;

async function insertUser(id: string, email: string): Promise<void> {
  await admin`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      ${id}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      extensions.crypt(extensions.gen_random_uuid()::text, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '', '', '', '', ''
    )
  `;
  await admin`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      ${id},
      ${id}::uuid,
      jsonb_build_object('sub', ${id}::text, 'email', ${email}::text),
      'email',
      now(), now(), now()
    )
  `;
}

async function addSite(owner: string, host: string): Promise<void> {
  await admin`
    insert into public.sites (owner_id, url, scope, host, hosting)
    values (
      ${owner}::uuid,
      ${`https://${host}`},
      'origin',
      ${host},
      'other'
    )
  `;
}

describe('plafonds SQL', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 4, prepare: false });
  }, 300_000);

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('refuse le 3e site actif d’un compte gratuit', async () => {
    const id = randomUUID();
    await insertUser(id, `cap-${id.slice(0, 8)}@example.com`);
    await addSite(id, `un-${id.slice(0, 8)}.example.com`);
    await addSite(id, `deux-${id.slice(0, 8)}.example.com`);
    await expect(
      addSite(id, `trois-${id.slice(0, 8)}.example.com`),
    ).rejects.toMatchObject({ code: 'P0001' });
    const rows = await admin<{ n: string }[]>`
      select count(*)::text as n
      from public.sites
      where owner_id = ${id}::uuid and deleted_at is null
    `;
    expect(rows[0]?.n).toBe('2');
  });

  it('ignore un site retiré et laisse passer un compte pro', async () => {
    const id = randomUUID();
    await insertUser(id, `pro-${id.slice(0, 8)}@example.com`);
    await addSite(id, `a-${id.slice(0, 8)}.example.com`);
    await addSite(id, `b-${id.slice(0, 8)}.example.com`);
    await admin`
      update public.sites
      set deleted_at = now()
      where owner_id = ${id}::uuid and host = ${`a-${id.slice(0, 8)}.example.com`}
    `;
    await addSite(id, `c-${id.slice(0, 8)}.example.com`);
    await admin`
      update public.profiles set plan = 'pro' where id = ${id}::uuid
    `;
    await addSite(id, `d-${id.slice(0, 8)}.example.com`);
    await addSite(id, `e-${id.slice(0, 8)}.example.com`);
    const rows = await admin<{ n: string }[]>`
      select count(*)::text as n
      from public.sites
      where owner_id = ${id}::uuid and deleted_at is null
    `;
    expect(rows[0]?.n).toBe('4');
  });

  it('une course sur le 3e site n’en laisse passer qu’un', async () => {
    const id = randomUUID();
    await insertUser(id, `course-${id.slice(0, 8)}@example.com`);
    await addSite(id, `base-${id.slice(0, 8)}.example.com`);
    const left = postgres(local.dbUrl, { max: 1, prepare: false });
    const right = postgres(local.dbUrl, { max: 1, prepare: false });
    try {
      const results = await Promise.allSettled([
        left`
          insert into public.sites (owner_id, url, scope, host, hosting)
          values (
            ${id}::uuid,
            ${`https://gauche-${id.slice(0, 8)}.example.com`},
            'origin',
            ${`gauche-${id.slice(0, 8)}.example.com`},
            'other'
          )
        `,
        right`
          insert into public.sites (owner_id, url, scope, host, hosting)
          values (
            ${id}::uuid,
            ${`https://droite-${id.slice(0, 8)}.example.com`},
            'origin',
            ${`droite-${id.slice(0, 8)}.example.com`},
            'other'
          )
        `,
      ]);
      expect(
        results.filter((item) => item.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find((item) => item.status === 'rejected');
      expect(rejected?.status).toBe('rejected');
      if (rejected?.status === 'rejected') {
        expect(rejected.reason).toMatchObject({ code: 'P0001' });
      }
    } finally {
      await left.end();
      await right.end();
    }
    const rows = await admin<{ n: string }[]>`
      select count(*)::text as n
      from public.sites
      where owner_id = ${id}::uuid and deleted_at is null
    `;
    expect(rows[0]?.n).toBe('2');
  });

  it('consume_rate_limit accorde 3 puis refuse', async () => {
    const key = 'cd'.repeat(32);
    const window = new Date('2026-11-03T00:00:00.000Z').toISOString();
    const answers: boolean[] = [];
    for (let i = 0; i < 4; i += 1) {
      const rows = await admin<{ ok: boolean }[]>`
        select public.consume_rate_limit(
          ${key},
          ${window}::timestamptz,
          3
        ) as ok
      `;
      answers.push(rows[0]?.ok === true);
    }
    expect(answers).toEqual([true, true, true, false]);
  });
});
