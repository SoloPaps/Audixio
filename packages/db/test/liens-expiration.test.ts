import { readFileSync } from 'node:fs';
import postgres, { type Sql, type TransactionSql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  repoRoot,
  resetLocalDatabase,
} from './local.js';

const USER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SITE = 'cccccccc-cccc-4ccc-8ccc-cccccccccc01';
const AUDIT = 'cccccccc-cccc-4ccc-8ccc-cccccccccc10';
const SECRET = 'secret-lien-expire-hsts';
const SHA = 'cd'.repeat(32);
const MIGRATION = readFileSync(
  `${repoRoot}supabase/migrations/20261103061242_liens_partage.sql`,
  'utf8',
);

let admin: Sql;
let local: LocalSupabase;
let unlock: (() => Promise<void>) | undefined;
let openToken = '';
let openId = '';

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

async function asAnon<T>(run: (tx: TransactionSql) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ role: 'anon' });
  const rows = await admin.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`select set_config('request.jwt.claim.sub', '', true)`;
    await tx.unsafe('set local role anon');
    return run(tx);
  });
  return rows as T;
}

async function scoreBody(token: string): Promise<string> {
  const [row] = await admin<{ body: string }[]>`
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)::text as body
    from public.read_shared_score(${token}) as x
  `;
  return row?.body ?? '[]';
}

async function reportBody(token: string): Promise<string> {
  const [row] = await admin<{ body: string }[]>`
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)::text as body
    from public.read_report_by_share_token(${token}) as x
  `;
  return row?.body ?? '[]';
}

describe('lien public expiré (SQL local)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 1, prepare: false });
    await insertUser(USER, 'lien-expire@example.com');
    await admin`
      insert into public.sites (
        id, owner_id, url, scope, host, label, hosting
      ) values (
        ${SITE}::uuid,
        ${USER}::uuid,
        'https://lien-expire.example',
        'origin',
        'lien-expire.example',
        'Lien expiré',
        'other'
      )
    `;
    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values (
        ${AUDIT}::uuid, ${SITE}::uuid, 'manual', 'passive', 'done',
        '2026.1', 'test', 40, 1, now(), now()
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
      ) values (
        ${AUDIT}::uuid, 'link', ${SHA}, 'public', '2099-01-01T00:00:00Z'
      )
    `;
    const [created] = await admin<{ id: string; share_token: string }[]>`
      select id::text as id, share_token
      from public.reports
      where audit_id = ${AUDIT}::uuid
        and link_kind = 'public'
        and expires_at = '2099-01-01T00:00:00Z'
    `;
    if (!created) throw new Error('lien absent');
    openId = created.id;
    openToken = created.share_token;
  });

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('sert encore le soft-gate tant que l’échéance est devant', async () => {
    const body = await scoreBody(openToken);
    expect(body).not.toBe('[]');
    expect(body).toContain('performance');
    expect(body).not.toContain('securite');
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain(openToken);
    expect(body).toMatch(/"global_score":\s*null/);
    const report = await reportBody(openToken);
    expect(report).toContain(openId);
    expect(report).not.toContain(openToken);
  });

  it('ne renvoie plus rien quand l’échéance est passée ou égale à maintenant', async () => {
    await admin`
      update public.reports
      set expires_at = '2000-01-01T00:00:00Z'
      where id = ${openId}::uuid
    `;
    expect(await scoreBody(openToken)).toBe('[]');
    expect(await reportBody(openToken)).toBe('[]');
    const direct = await asAnon(
      (tx) => tx<{ n: number }[]>`
        select count(*)::int as n
        from public.reports
        where id = ${openId}::uuid
      `,
    );
    expect(direct[0]?.n).toBe(0);

    await admin`
      update public.reports
      set expires_at = now()
      where id = ${openId}::uuid
    `;
    expect(await scoreBody(openToken)).toBe('[]');
    expect(await reportBody(openToken)).toBe('[]');
  });

  it('laisse un lien ancien sans date, et refuse un kind inconnu', async () => {
    await admin`
      update public.reports
      set expires_at = null, link_kind = null
      where id = ${openId}::uuid
    `;
    const body = await scoreBody(openToken);
    expect(body).toContain('performance');
    expect(body).not.toContain(SECRET);
    await expect(
      admin`
        update public.reports
        set link_kind = 'ouvert'
        where id = ${openId}::uuid
      `,
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('reprend le journal et reste idempotent, RLS comprise', async () => {
    const [before] = await admin<{ names: string[] }[]>`
      select coalesce(array_agg(p.polname order by p.polname), '{}') as names
      from pg_policy as p
      join pg_class as c on c.oid = p.polrelid
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'reports'
    `;
    await admin`
      insert into public.reports (audit_id, visibility, manifest_sha256)
      values (${AUDIT}::uuid, 'link', ${SHA})
    `;
    const [fresh] = await admin<{ id: string; share_token: string }[]>`
      select id::text as id, share_token
      from public.reports
      where audit_id = ${AUDIT}::uuid and link_kind is null
      order by created_at desc
      limit 1
    `;
    if (!fresh) throw new Error('ligne sans kind absente');
    const at = '2026-01-15T08:30:00.000Z';
    await admin`
      insert into public.audit_log (actor, action, target, at, details)
      values (
        ${USER}::uuid,
        'share_link',
        ${fresh.id},
        ${at}::timestamptz,
        ${admin.json({
          kind: 'public',
          audit_id: AUDIT,
          token_sha256: SHA,
          expires_at: '2000-06-01T00:00:00.000Z',
          revoked_at: null,
        })}
      )
    `;
    await admin.unsafe(MIGRATION);
    await admin.unsafe(MIGRATION);
    const [filled] = await admin<
      { link_kind: string; expires_at: Date; created_at: Date }[]
    >`
      select link_kind, expires_at, created_at
      from public.reports
      where id = ${fresh.id}::uuid
    `;
    expect(filled?.link_kind).toBe('public');
    expect(filled?.expires_at.toISOString()).toBe('2000-06-01T00:00:00.000Z');
    expect(filled?.created_at.toISOString()).toBe(at);
    expect(await scoreBody(fresh.share_token)).toBe('[]');
    expect(await reportBody(fresh.share_token)).toBe('[]');
    const [after] = await admin<{ names: string[]; rls: boolean }[]>`
      select
        coalesce(array_agg(p.polname order by p.polname), '{}') as names,
        bool_and(c.relrowsecurity) as rls
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      left join pg_policy as p on p.polrelid = c.oid
      where n.nspname = 'public' and c.relname = 'reports'
      group by c.oid
    `;
    expect(after?.rls).toBe(true);
    expect(after?.names).toEqual(before?.names);
    expect(local.dbUrl).toContain('127.0.0.1');
  });
});
