import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type AuthEnv, handleAuthRequest } from '../src/auth-http.js';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

let admin: Sql;
let local: LocalSupabase;
let env: AuthEnv;
let unlock: (() => Promise<void>) | undefined;

function jarFrom(res: Response, jar: Map<string, string>): void {
  for (const line of res.headers.getSetCookie()) {
    const parts = line.split(';').map((part) => part.trim());
    const pair = parts[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const dead = parts.some((part) => part.toLowerCase() === 'max-age=0');
    if (dead || value === '') jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function call(
  path: string,
  init: {
    method?: string;
    form?: Record<string, string>;
    jar?: Map<string, string>;
    ip?: string;
    json?: boolean;
  } = {},
): Promise<Response> {
  const headers = new Headers();
  if (init.json !== false) headers.set('accept', 'application/json');
  if (init.jar) headers.set('cookie', cookieHeader(init.jar));
  if (init.ip) headers.set('x-forwarded-for', init.ip);
  let body: string | undefined;
  if (init.form) {
    headers.set('content-type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(init.form).toString();
  }
  const method = init.method ?? 'POST';
  const request = body
    ? new Request(`http://127.0.0.1:4321${path}`, { method, headers, body })
    : new Request(`http://127.0.0.1:4321${path}`, { method, headers });
  return handleAuthRequest(request, env);
}

async function letterHtml(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await fetch(`${local.mailpitUrl}/api/v1/messages`);
    const body = (await list.json()) as {
      messages?: {
        ID?: string;
        Subject?: string;
        To?: { Address?: string }[];
      }[];
    };
    const hit = body.messages?.find((message) =>
      message.To?.some((to) => to.Address === email),
    );
    if (hit?.ID) {
      const full = await fetch(`${local.mailpitUrl}/api/v1/message/${hit.ID}`);
      const detail = (await full.json()) as { HTML?: string; Text?: string };
      return `${detail.HTML ?? ''}\n${detail.Text ?? ''}`;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`courriel absent pour ${email}`);
}

describe('connexion Supabase local', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    env = {
      url: local.apiUrl,
      anonKey: local.anonKey,
      serviceRoleKey: local.serviceRoleKey,
    };
    admin = postgres(local.dbUrl, { max: 1, prepare: false });
  }, 180_000);

  afterAll(async () => {
    await admin?.end({ timeout: 5 });
    await unlock?.();
  });

  it('fige note_lettre et limite EXECUTE', async () => {
    const [config] = await admin<{ proconfig: string[] | null }[]>`
      select p.proconfig
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.proname = 'note_lettre'
    `;
    expect(
      config?.proconfig?.some((item) => item.startsWith('search_path=')),
    ).toBe(true);
    const [letters] = await admin<
      { a: string; e: string; nul: string | null }[]
    >`
      select
        private.note_lettre(90) as a,
        private.note_lettre(39) as e,
        private.note_lettre(null) as nul
    `;
    expect(letters).toEqual({ a: 'A', e: 'E', nul: null });

    const [priv] = await admin<
      {
        anon_oauth: boolean;
        auth_oauth: boolean;
        anon_score: boolean;
        anon_shared: boolean;
        anon_report: boolean;
        anon_rate: boolean;
        svc_rate: boolean;
        anon_note: boolean;
      }[]
    >`
      select
        has_function_privilege('anon', 'public.list_my_oauth_connections()', 'execute') as anon_oauth,
        has_function_privilege('authenticated', 'public.list_my_oauth_connections()', 'execute') as auth_oauth,
        has_function_privilege('anon', 'public.read_public_score(text)', 'execute') as anon_score,
        has_function_privilege('anon', 'public.read_shared_score(text)', 'execute') as anon_shared,
        has_function_privilege('anon', 'public.read_report_by_share_token(text)', 'execute') as anon_report,
        has_function_privilege('anon', 'public.consume_rate_limit(text, timestamptz, integer)', 'execute') as anon_rate,
        has_function_privilege('service_role', 'public.consume_rate_limit(text, timestamptz, integer)', 'execute') as svc_rate,
        has_function_privilege('anon', 'private.note_lettre(integer)', 'execute') as anon_note
    `;
    expect(priv).toEqual({
      anon_oauth: false,
      auth_oauth: true,
      anon_score: true,
      anon_shared: true,
      anon_report: true,
      anon_rate: false,
      svc_rate: true,
      anon_note: false,
    });
  });

  it('inscrit, confirme, et ne dit pas si l’adresse existe', async () => {
    const email = `inscrit-${Date.now()}@exemple.fr`;
    const password = 'phrase-de-test-12';
    const jar = new Map<string, string>();
    const created = await call('/api/auth/inscription', {
      form: { email, password, terms: 'on' },
      ip: '203.0.113.10',
      jar,
    });
    jarFrom(created, jar);
    const createdBody = (await created.json()) as { ok?: boolean };
    expect(created.status).toBe(200);
    expect(createdBody.ok).toBe(true);
    expect(
      created.headers.getSetCookie().some((line) => /httponly/i.test(line)),
    ).toBe(true);

    const again = await call('/api/auth/inscription', {
      form: { email, password, terms: 'on' },
      ip: '203.0.113.11',
    });
    const againBody = (await again.json()) as { ok?: boolean; error?: string };
    expect(again.status).toBe(200);
    expect(againBody.ok).toBe(true);
    expect(againBody.error).toBeNull();

    const html = await letterHtml(email);
    const hash = /token_hash=([^&"'\s]+)/u.exec(html)?.[1];
    expect(hash).toBeTruthy();
    const callback = await handleAuthRequest(
      new Request(
        `http://127.0.0.1:4321/api/auth/callback?token_hash=${hash}&type=signup`,
        { headers: { cookie: cookieHeader(jar) } },
      ),
      env,
    );
    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toContain('/email-confirme');
    const sessionJar = new Map<string, string>();
    jarFrom(callback, sessionJar);
    expect(
      callback.headers
        .getSetCookie()
        .some((line) => line.startsWith('sb-') && /httponly/i.test(line)),
    ).toBe(true);

    const session = await call('/api/auth/session', {
      method: 'GET',
      jar: sessionJar,
    });
    const sessionBody = (await session.json()) as {
      user?: { email?: string };
    };
    expect(session.status).toBe(200);
    expect(sessionBody.user?.email).toBe(email);

    const [profile] = await admin<{ onboarding_vu: boolean }[]>`
      select onboarding_vu
      from public.profiles as p
      join auth.users as u on u.id = p.id
      where u.email = ${email}
    `;
    expect(profile?.onboarding_vu).toBe(true);

    const wrong = await call('/api/auth/connexion', {
      form: { email, password: 'pas-le-bon-mot-de-passe' },
      ip: '203.0.113.20',
    });
    const wrongBody = (await wrong.json()) as { error?: string };
    expect(wrong.status).toBe(400);
    expect(wrongBody.error).toBe('invalid_credentials');

    const missing = await call('/api/auth/connexion', {
      form: {
        email: 'personne-inconnue@exemple.fr',
        password: 'phrase-de-test-12',
      },
      ip: '203.0.113.21',
    });
    const missingBody = (await missing.json()) as { error?: string };
    expect(missingBody.error).toBe('invalid_credentials');

    const good = await call('/api/auth/connexion', {
      form: { email, password, remember: 'on' },
      ip: '203.0.113.22',
    });
    expect(good.status).toBe(200);
    expect(
      good.headers
        .getSetCookie()
        .some((line) => line.startsWith('audixio_connecte=1')),
    ).toBe(true);
  }, 90_000);

  it('renvoie un lien sans dire si l’adresse existe', async () => {
    const res = await call('/api/auth/renvoi', {
      form: { email: 'absent-renvoi@exemple.fr' },
      ip: '203.0.113.80',
    });
    const body = (await res.json()) as { ok?: boolean; error?: string | null };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.error).toBeNull();
  });

  it('bloque après trop de tentatives de connexion', async () => {
    const email = 'debit-auth@exemple.fr';
    let status = 0;
    for (let i = 0; i < 9; i += 1) {
      const res = await call('/api/auth/connexion', {
        form: { email, password: 'mauvais-mot-de-passe' },
        ip: '203.0.113.50',
      });
      status = res.status;
    }
    expect(status).toBe(429);
  }, 90_000);
});
