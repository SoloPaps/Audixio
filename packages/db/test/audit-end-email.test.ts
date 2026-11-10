import postgres, { type Sql, type TransactionSql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SITE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
const AUDIT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10';
const SCHEDULED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11';

let admin: Sql;
let unlock: (() => Promise<void>) | undefined;

async function insertUser(id: string, email: string) {
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
}

async function asUser<T>(
  userId: string,
  run: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  return admin.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx.unsafe('set local role authenticated');
    return run(tx);
  }) as Promise<T>;
}

describe('e-mail de fin d’audit (migration et RLS)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    const local: LocalSupabase = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 4, prepare: false });
    await insertUser(OWNER, 'fin-owner@example.com');
    await insertUser(OTHER, 'fin-other@example.com');
    await admin`
      insert into public.sites (
        id, owner_id, url, scope, host, label, hosting
      ) values (
        ${SITE}::uuid, ${OWNER}::uuid, 'https://fin.example.com', 'origin',
        'fin.example.com', 'Fin', 'other'
      )
    `;
    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values
        (${AUDIT}::uuid, ${SITE}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 65, 1, now(), now()),
        (${SCHEDULED}::uuid, ${SITE}::uuid, 'schedule', 'passive', 'done', '2026.1', 'test', 70, 1, now(), now())
    `;
  });

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('active le réglage par défaut et le réserve au propriétaire', async () => {
    const rows = await admin<{ notify_audit_end: boolean }[]>`
      select notify_audit_end from public.profiles where id = ${OWNER}::uuid
    `;
    expect(rows[0]?.notify_audit_end).toBe(true);

    await asUser(
      OTHER,
      (tx) => tx`
        update public.profiles
        set notify_audit_end = false
        where id = ${OWNER}::uuid
      `,
    );
    const foreign = await admin<{ notify_audit_end: boolean }[]>`
      select notify_audit_end from public.profiles where id = ${OWNER}::uuid
    `;
    expect(foreign[0]?.notify_audit_end).toBe(true);

    await asUser(
      OWNER,
      (tx) => tx`
        update public.profiles
        set notify_audit_end = false
        where id = ${OWNER}::uuid
      `,
    );
    const after = await admin<{ notify_audit_end: boolean }[]>`
      select notify_audit_end from public.profiles where id = ${OWNER}::uuid
    `;
    expect(after[0]?.notify_audit_end).toBe(false);

    await asUser(
      OWNER,
      (tx) => tx`
        update public.profiles
        set notify_audit_end = true
        where id = ${OWNER}::uuid
      `,
    );
  });

  it('réclame un envoi une seule fois pour un audit manuel terminé', async () => {
    const first = await admin<{ claim_audit_end_email: boolean }[]>`
      select public.claim_audit_end_email(${AUDIT}::uuid)
    `;
    expect(first[0]?.claim_audit_end_email).toBe(true);
    const second = await admin<{ claim_audit_end_email: boolean }[]>`
      select public.claim_audit_end_email(${AUDIT}::uuid)
    `;
    expect(second[0]?.claim_audit_end_email).toBe(false);
    const scheduled = await admin<{ claim_audit_end_email: boolean }[]>`
      select public.claim_audit_end_email(${SCHEDULED}::uuid)
    `;
    expect(scheduled[0]?.claim_audit_end_email).toBe(false);
    await admin`select public.release_audit_end_email(${AUDIT}::uuid)`;
    const again = await admin<{ claim_audit_end_email: boolean }[]>`
      select public.claim_audit_end_email(${AUDIT}::uuid)
    `;
    expect(again[0]?.claim_audit_end_email).toBe(true);
  });
});
