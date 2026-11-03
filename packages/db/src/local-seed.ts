import type { Sql, TransactionSql } from 'postgres';
import { assertLocalSupabase } from './local-only.js';

export interface LocalAccount {
  id: string;
  email: string;
  password: string;
  plan: 'free' | 'pro';
  label: string;
}

export const LOCAL_TEST_ACCOUNTS: readonly LocalAccount[] = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    email: 'gratuit@localhost',
    password: 'Audixio-local-gratuit',
    plan: 'free',
    label: 'Compte gratuit',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b1',
    email: 'pro@localhost',
    password: 'Audixio-local-pro',
    plan: 'pro',
    label: 'Compte Pro',
  },
];

const PRO_SITE = '00000000-0000-4000-8000-0000000000b2';
const PRO_URL = 'https://bon.audigy.test/';
const PRO_HOST = 'bon.audigy.test';
const VERIFY_TOKEN = 'AudixioLocalVerifyToken0000000001';

const HISTORY: readonly { id: string; days: number; score: number }[] = [
  { id: '00000000-0000-4000-8000-0000000000b3', days: 21, score: 64 },
  { id: '00000000-0000-4000-8000-0000000000b4', days: 10, score: 78 },
  { id: '00000000-0000-4000-8000-0000000000b5', days: 1, score: 86 },
];

const DOMAINS = [
  'performance',
  'seo',
  'securite',
  'ecologie',
  'accessibilite',
  'qualite',
  'vie_privee',
  'dns_email',
] as const;

function level(score: number): 'good' | 'improve' | 'problem' {
  if (score >= 80) return 'good';
  if (score >= 50) return 'improve';
  return 'problem';
}

/** Ajoute ou retire le réglage. Hors local, la ligne est retirée. */
export function guestLiftLine(envText: string, local: boolean): string {
  const rows = envText
    .split('\n')
    .filter((row) => !row.startsWith('AUDIGY_GUEST_UNLIMITED='));
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  if (!local) return rows.length === 0 ? '' : `${rows.join('\n')}\n`;
  rows.push('AUDIGY_GUEST_UNLIMITED=1');
  return `${rows.join('\n')}\n`;
}

export function localAccountsMessage(): string {
  const lines = LOCAL_TEST_ACCOUNTS.map(
    (account) =>
      `- ${account.email} / ${account.password} (${account.plan === 'pro' ? 'Pro, site https://bon.audigy.test déjà vérifié, 3 audits' : 'gratuit'})`,
  );
  return [
    'Comptes de test locaux (impossibles hors Supabase local) :',
    ...lines,
    'Plafond des 3 audits sans compte levé seulement si SUPABASE_URL est locale et AUDIGY_GUEST_UNLIMITED=1.',
  ].join('\n');
}

async function upsertUser(
  sql: TransactionSql,
  account: LocalAccount,
): Promise<void> {
  await sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      ${account.id}::uuid,
      'authenticated',
      'authenticated',
      ${account.email},
      extensions.crypt(${account.password}, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', ${account.label}::text),
      now(), now(),
      '', '', '', '', '', ''
    )
    on conflict (id) do update set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = now(),
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now()
  `;
  await sql`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select
      ${account.id},
      ${account.id}::uuid,
      jsonb_build_object('sub', ${account.id}::text, 'email', ${account.email}::text),
      'email',
      now(), now(), now()
    where not exists (
      select 1 from auth.identities as i
      where i.user_id = ${account.id}::uuid and i.provider = 'email'
    )
  `;
  await sql`
    insert into public.profiles (id, display_name, plan, onboarding_vu)
    values (${account.id}::uuid, ${account.label}, ${account.plan}, true)
    on conflict (id) do update set
      display_name = excluded.display_name,
      plan = excluded.plan,
      onboarding_vu = true
  `;
}

async function seedProHistory(
  sql: TransactionSql,
  ownerId: string,
): Promise<void> {
  await sql`
    insert into public.sites (
      id, owner_id, url, scope, host, label, hosting, is_public
    ) values (
      ${PRO_SITE}::uuid,
      ${ownerId}::uuid,
      ${PRO_URL},
      'origin',
      ${PRO_HOST},
      'Exemple vérifié',
      'other',
      false
    )
    on conflict (id) do update set
      label = excluded.label,
      deleted_at = null
  `;
  await sql`delete from public.site_verifications where site_id = ${PRO_SITE}::uuid`;
  await sql`
    insert into public.site_verifications (
      site_id, method, token, status, verified_at, last_checked_at
    ) values (
      ${PRO_SITE}::uuid,
      'file',
      ${VERIFY_TOKEN},
      'verified',
      now(),
      now()
    )
  `;
  for (const row of HISTORY) {
    await sql`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, created_at, started_at, finished_at
      ) values (
        ${row.id}::uuid,
        ${PRO_SITE}::uuid,
        'manual',
        'passive',
        'done',
        'local',
        'local',
        ${row.score},
        1,
        now() - make_interval(days => ${row.days}),
        now() - make_interval(days => ${row.days}),
        now() - make_interval(days => ${row.days}) + interval '2 minutes'
      )
      on conflict (id) do update set
        status = excluded.status,
        global_score = excluded.global_score,
        coverage = excluded.coverage,
        created_at = excluded.created_at,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        error = null
    `;
  }
  const ids = HISTORY.map((row) => row.id);
  await sql`delete from public.domain_scores where audit_id in ${sql(ids)}`;
  for (const row of HISTORY) {
    for (const domain of DOMAINS) {
      await sql`
        insert into public.domain_scores (audit_id, domain, score, coverage, level)
        values (
          ${row.id}::uuid,
          ${domain},
          ${row.score},
          1,
          ${level(row.score)}
        )
      `;
    }
  }
}

/**
 * Comptes de test. Jette `hors_local` avant toute requête si l’URL
 * d’API ou de base n’est pas locale.
 */
export async function seedLocalAccounts(
  sql: Sql,
  urls: { apiUrl: string; dbUrl: string },
): Promise<readonly LocalAccount[]> {
  assertLocalSupabase(urls.apiUrl);
  assertLocalSupabase(urls.dbUrl);
  const pro = LOCAL_TEST_ACCOUNTS.find((account) => account.plan === 'pro');
  if (!pro) throw new Error('compte_pro_absent');
  await sql.begin(async (tx) => {
    for (const account of LOCAL_TEST_ACCOUNTS) {
      await upsertUser(tx, account);
    }
    await seedProHistory(tx, pro.id);
  });
  return LOCAL_TEST_ACCOUNTS;
}

/** Ouvre la base locale, puis seed. Refuse avant toute connexion si l’URL n’est pas locale. */
export async function seedLocalDatabase(urls: {
  apiUrl: string;
  dbUrl: string;
}): Promise<readonly LocalAccount[]> {
  assertLocalSupabase(urls.apiUrl);
  assertLocalSupabase(urls.dbUrl);
  const { default: postgres } = await import('postgres');
  const sql = postgres(urls.dbUrl, { max: 1, prepare: false });
  try {
    return await seedLocalAccounts(sql, urls);
  } finally {
    await sql.end();
  }
}
