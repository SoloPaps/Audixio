import postgres, { type Sql, type TransactionSql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

const FREE = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PRO = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const FREE_SITE = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01';
const FREE_SITE_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02';
const PRO_SITE = 'ffffffff-ffff-4fff-8fff-ffffffffff01';
const PRO_SITE_B = 'ffffffff-ffff-4fff-8fff-ffffffffff02';
const FREE_AUDIT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee10';
const FREE_AUDIT_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11';
const PRO_AUDIT = 'ffffffff-ffff-4fff-8fff-ffffffffff10';
const PRO_AUDIT_B = 'ffffffff-ffff-4fff-8fff-ffffffffff11';
const SHA = 'cd'.repeat(32);

let admin: Sql;
let unlock: (() => Promise<void>) | undefined;

async function insertUser(id: string, email: string, plan: 'free' | 'pro') {
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
  await admin`update public.profiles set plan = ${plan} where id = ${id}::uuid`;
}

async function asUser<T>(
  userId: string,
  run: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  const rows = await admin.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx.unsafe('set local role authenticated');
    return run(tx);
  });
  return rows as T;
}

describe('plafond d’un lien du plan gratuit (SQL)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    const local: LocalSupabase = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 4, prepare: false });
    await insertUser(FREE, 'gratuit-quota@example.com', 'free');
    await insertUser(PRO, 'pro-quota@example.com', 'pro');
    await admin`
      insert into public.sites (
        id, owner_id, url, scope, host, label, hosting, is_public
      ) values
        (${FREE_SITE}::uuid, ${FREE}::uuid, 'https://free-q.example.com', 'origin', 'free-q.example.com', 'Free Q', 'other', false),
        (${FREE_SITE_B}::uuid, ${FREE}::uuid, 'https://free-q2.example.com', 'origin', 'free-q2.example.com', 'Free Q2', 'other', false),
        (${PRO_SITE}::uuid, ${PRO}::uuid, 'https://pro-q.example.com', 'origin', 'pro-q.example.com', 'Pro Q', 'other', false),
        (${PRO_SITE_B}::uuid, ${PRO}::uuid, 'https://pro-q2.example.com', 'origin', 'pro-q2.example.com', 'Pro Q2', 'other', false)
    `;
    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values
        (${FREE_AUDIT}::uuid, ${FREE_SITE}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 80, 1, now(), now()),
        (${FREE_AUDIT_B}::uuid, ${FREE_SITE_B}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 70, 1, now(), now()),
        (${PRO_AUDIT}::uuid, ${PRO_SITE}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 90, 1, now(), now()),
        (${PRO_AUDIT_B}::uuid, ${PRO_SITE_B}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 88, 1, now(), now())
    `;
  });

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('un compte gratuit ne peut pas publier un 2e occupant, même via update RLS direct', async () => {
    await asUser(
      FREE,
      (tx) => tx`
        update public.sites
        set is_public = true, public_slug = 'free-q-one'
        where id = ${FREE_SITE}::uuid
      `,
    );
    const used = await admin<{ n: number }[]>`
      select public.free_link_slots_used(${FREE}::uuid) as n
    `;
    expect(used[0]?.n).toBe(1);

    await expect(
      asUser(
        FREE,
        (tx) => tx`
          update public.sites
          set is_public = true, public_slug = 'free-q-two'
          where id = ${FREE_SITE_B}::uuid
        `,
      ),
    ).rejects.toMatchObject({ code: 'P0001', message: 'user_limit' });

    await expect(
      asUser(
        FREE,
        (tx) => tx`
          insert into public.reports (audit_id, visibility, manifest_sha256)
          values (${FREE_AUDIT}::uuid, 'link', ${SHA})
        `,
      ),
    ).rejects.toMatchObject({ code: 'P0001', message: 'user_limit' });
  });

  it('un Pro peut publier un site et un lien, puis un second occupant', async () => {
    await asUser(
      PRO,
      (tx) => tx`
        update public.sites
        set is_public = true, public_slug = 'pro-q-one'
        where id = ${PRO_SITE}::uuid
      `,
    );
    await asUser(
      PRO,
      (tx) => tx`
        insert into public.reports (audit_id, visibility, manifest_sha256)
        values (${PRO_AUDIT}::uuid, 'link', ${SHA})
      `,
    );
    await asUser(
      PRO,
      (tx) => tx`
        update public.sites
        set is_public = true, public_slug = 'pro-q-two'
        where id = ${PRO_SITE_B}::uuid
      `,
    );
    const used = await admin<{ n: number }[]>`
      select public.free_link_slots_used(${PRO}::uuid) as n
    `;
    expect(used[0]?.n).toBeGreaterThanOrEqual(2);
  });
});
