import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from '../../db/test/local.js';

const USER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SITE = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01';
const AUDIT = 'dddddddd-dddd-4ddd-8ddd-dddddddddd10';
const SECRET = 'secret-e2e-lien-expire';
const SHA = 'ef'.repeat(32);

let admin: Sql;
let local: LocalSupabase;
let unlock: (() => Promise<void>) | undefined;
let expiredToken = '';
let openToken = '';

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

async function rpc(name: string, token: string): Promise<string> {
  const response = await fetch(`${local.apiUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: local.anonKey,
      authorization: `Bearer ${local.anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  });
  expect(response.status).toBe(200);
  return response.text();
}

describe('lien public expiré (API locale)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 1, prepare: false });
    await insertUser(USER, 'lien-e2e@example.com');
    await admin`
      insert into public.sites (
        id, owner_id, url, scope, host, label, hosting
      ) values (
        ${SITE}::uuid, ${USER}::uuid, 'https://lien-e2e.example',
        'origin', 'lien-e2e.example', 'E2E', 'other'
      )
    `;
    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values (
        ${AUDIT}::uuid, ${SITE}::uuid, 'manual', 'passive', 'done',
        '2026.1', 'test', 55, 1, now(), now()
      )
    `;
    await admin`
      insert into public.domain_scores (audit_id, domain, score, coverage, level)
      values
        (${AUDIT}::uuid, 'performance', 80, 1, 'good'),
        (${AUDIT}::uuid, 'securite', 20, 1, 'problem')
    `;
    await admin`
      insert into public.findings (
        audit_id, domain, check_id, status, severity, impact, score,
        message_key, measured
      ) values (
        ${AUDIT}::uuid, 'securite', 'securite.hsts', 'fail', 4, 3, 0,
        'finding.securite.hsts', jsonb_build_object('raw', ${SECRET}::text)
      )
    `;
    await admin`
      insert into public.reports (
        audit_id, visibility, manifest_sha256, link_kind, expires_at
      ) values
        (${AUDIT}::uuid, 'link', ${SHA}, 'public', '2000-01-01T00:00:00Z'),
        (${AUDIT}::uuid, 'link', ${SHA}, 'public', '2099-01-01T00:00:00Z')
    `;
    const rows = await admin<{ share_token: string; expires_at: Date }[]>`
      select share_token, expires_at
      from public.reports
      where audit_id = ${AUDIT}::uuid and link_kind = 'public'
    `;
    expiredToken =
      rows.find((row) => row.expires_at.getUTCFullYear() === 2000)
        ?.share_token ?? '';
    openToken =
      rows.find((row) => row.expires_at.getUTCFullYear() === 2099)
        ?.share_token ?? '';
    if (!expiredToken || !openToken) throw new Error('jetons absents');
  });

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('un lien public expiré ne sert plus rien, un lien ouvert reste en soft-gate', async () => {
    const score = await rpc('read_shared_score', expiredToken);
    const report = await rpc('read_report_by_share_token', expiredToken);
    expect(score).toBe('[]');
    expect(report).toBe('[]');
    expect(score).not.toContain(SECRET);
    expect(score).not.toContain(expiredToken);
    expect(report).not.toContain(expiredToken);

    const open = await rpc('read_shared_score', openToken);
    expect(open).toContain('performance');
    expect(open).toContain('"global_score":null');
    expect(open).not.toContain('securite');
    expect(open).not.toContain(SECRET);
    expect(open).not.toContain(openToken);
  });
});
