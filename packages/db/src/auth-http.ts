import {
  type CookieOptions,
  createServerClient,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { readCookies } from './auth-guard.js';
import {
  AUTH_LIMITS,
  type AuthErrorCode,
  cleanDisplayName,
  landingPath,
  normalizeEmail,
  providersOf,
  safeNextPath,
  validEmail,
  validPassword,
  windowStartIso,
} from './auth-policy.js';
import { createServiceClient } from './client.js';
import type { Database } from './database.types.js';
import { TERMS_VERSION } from './terms.js';

export interface AuthEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export function authEnvFrom(env: NodeJS.ProcessEnv): AuthEnv | null {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

interface PendingCookie {
  line: string;
}

export async function handleAuthRequest(
  request: Request,
  env: AuthEnv | null,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/u, '') || '/';
  const secure = url.protocol === 'https:';
  const pending: PendingCookie[] = [];
  if (!env) return finish(request, 'unavailable', '/connexion', 503, pending);

  const formRemember = await rememberChoice(request);
  const cookieSessionOnly = (request.headers.get('cookie') ?? '').includes(
    'audixio_session_only=1',
  );
  const sessionOnly =
    request.method === 'POST' && path === '/api/auth/connexion'
      ? !formRemember
      : cookieSessionOnly;
  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return readCookies(request.headers.get('cookie') ?? '');
      },
      setAll(cookies) {
        for (const cookie of cookies) {
          pending.push({
            line: serializeCookieHeader(
              cookie.name,
              cookie.value,
              harden(cookie.options, secure, sessionOnly),
            ),
          });
        }
      },
    },
  });

  const service = createServiceClient({
    url: env.url,
    serviceRoleKey: env.serviceRoleKey,
  });

  if (request.method === 'GET' && path === '/api/auth/session') {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      pending.push({ line: flagCookie(false, secure, true) });
      return json({ ok: false }, 401, pending);
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const access = sessionData.session?.access_token;
    if (!access) return json({ ok: false }, 401, pending);
    const profile = await readProfile(supabase, userData.user.id);
    pending.push({ line: flagCookie(true, secure, !sessionOnly) });
    return json(
      {
        ok: true,
        access_token: access,
        expires_at: sessionData.session?.expires_at ?? 0,
        expires_in: sessionData.session?.expires_in ?? 0,
        token_type: 'bearer',
        refresh_token: '',
        displayName: profile.displayName,
        user: userData.user,
      },
      200,
      pending,
    );
  }

  if (request.method === 'POST' && path === '/api/auth/deconnexion') {
    await supabase.auth.signOut();
    pending.push({ line: flagCookie(false, secure, true) });
    pending.push({ line: sessionOnlyCookie(false, secure) });
    return answer(request, null, '/connexion', 200, pending);
  }

  if (request.method === 'GET' && path === '/api/auth/oauth') {
    const provider = url.searchParams.get('provider');
    if (provider !== 'google' && provider !== 'github') {
      return finish(request, 'oauth', '/connexion?erreur=oauth', 400, pending);
    }
    const next = safeNextPath(url.searchParams.get('next'), '/sites');
    pending.push({
      line: serializeCookieHeader('audixio_next', next, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 600,
      }),
    });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(url),
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      return finish(request, 'oauth', '/connexion?erreur=oauth', 503, pending);
    }
    return redirect(data.url, 303, pending);
  }

  if (request.method === 'GET' && path === '/api/auth/callback') {
    return handleCallback(request, url, supabase, pending, secure);
  }

  if (request.method === 'POST' && path === '/api/auth/bienvenue') {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return json({ ok: false }, 401, pending);
    await supabase
      .from('profiles')
      .update({ onboarding_vu: true })
      .eq('id', data.user.id);
    return json({ ok: true }, 200, pending);
  }

  if (request.method !== 'POST') {
    return finish(request, 'unavailable', '/connexion', 405, pending);
  }

  const form = new URLSearchParams(await request.text());
  const email = normalizeEmail(form.get('email') ?? '');
  const password = form.get('password') ?? '';
  const confirm = form.get('password_confirm') ?? '';
  const next = safeNextPath(form.get('next'), '/sites');

  if (path === '/api/auth/connexion') {
    if (!validEmail(email) || password.length === 0 || password.length > 72) {
      return finish(
        request,
        'invalid_credentials',
        '/connexion?erreur=identifiants',
        400,
        pending,
      );
    }
    if (!(await allow(service, request, 'signin', email))) {
      return finish(
        request,
        'rate_limited',
        '/connexion?erreur=debit',
        429,
        pending,
      );
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return finish(
        request,
        'invalid_credentials',
        '/connexion?erreur=identifiants',
        400,
        pending,
      );
    }
    pending.push({ line: flagCookie(true, secure, formRemember) });
    pending.push({ line: sessionOnlyCookie(!formRemember, secure) });
    return answer(request, null, next, 200, pending);
  }

  if (path === '/api/auth/inscription') {
    if (!validEmail(email)) {
      return finish(
        request,
        'invalid_email',
        '/inscription?erreur=email',
        400,
        pending,
      );
    }
    if (!validPassword(password)) {
      return finish(
        request,
        'invalid_password',
        '/inscription?erreur=mot',
        400,
        pending,
      );
    }
    if (form.get('terms') !== 'on') {
      return finish(
        request,
        'terms_required',
        '/inscription?erreur=conditions',
        400,
        pending,
      );
    }
    if (!(await allow(service, request, 'signup', email))) {
      return finish(
        request,
        'rate_limited',
        '/inscription?erreur=debit',
        429,
        pending,
      );
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(url) },
    });
    if (error && !benignSignup(error.message, codeOf(error))) {
      const code = error.message.toLowerCase().includes('password')
        ? 'invalid_password'
        : 'unavailable';
      return finish(
        request,
        code,
        code === 'invalid_password'
          ? '/inscription?erreur=mot'
          : '/inscription?erreur=indisponible',
        code === 'invalid_password' ? 400 : 503,
        pending,
      );
    }
    pending.push({
      line: serializeCookieHeader('audixio_cgu', TERMS_VERSION, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 86_400,
      }),
    });
    return answer(request, null, '/inscription?envoye=1', 200, pending);
  }

  if (path === '/api/auth/renvoi') {
    if (!validEmail(email)) {
      return finish(
        request,
        'invalid_email',
        '/connexion?erreur=email',
        400,
        pending,
      );
    }
    if (!(await allow(service, request, 'signup', email))) {
      return finish(
        request,
        'rate_limited',
        '/connexion?erreur=debit',
        429,
        pending,
      );
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: callbackUrl(url) },
    });
    if (error && !quietResend(error.message, codeOf(error))) {
      return finish(
        request,
        'unavailable',
        '/connexion?erreur=indisponible',
        503,
        pending,
      );
    }
    return answer(request, null, '/connexion?envoye=1', 200, pending);
  }

  if (path === '/api/auth/reinitialisation') {
    if (!validEmail(email)) {
      return finish(
        request,
        'invalid_email',
        '/reinitialisation?erreur=email',
        400,
        pending,
      );
    }
    if (!(await allow(service, request, 'reset', email))) {
      return finish(
        request,
        'rate_limited',
        '/reinitialisation?erreur=debit',
        429,
        pending,
      );
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl(url),
    });
    return answer(request, null, '/reinitialisation?envoye=1', 200, pending);
  }

  if (path === '/api/auth/mot-de-passe') {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return finish(
        request,
        'link',
        '/reinitialisation?erreur=lien',
        401,
        pending,
      );
    }
    if (!validPassword(password)) {
      return finish(
        request,
        'invalid_password',
        '/reinitialisation?etape=nouveau&erreur=mot',
        400,
        pending,
      );
    }
    if (password !== confirm) {
      return finish(
        request,
        'mismatch',
        '/reinitialisation?etape=nouveau&erreur=different',
        400,
        pending,
      );
    }
    const updated = await supabase.auth.updateUser({ password });
    if (updated.error) {
      return finish(
        request,
        'unavailable',
        '/reinitialisation?etape=nouveau&erreur=indisponible',
        503,
        pending,
      );
    }
    pending.push({ line: flagCookie(true, secure, true) });
    return answer(request, null, '/compte', 200, pending);
  }

  return finish(request, 'unavailable', '/connexion', 404, pending);
}

async function handleCallback(
  request: Request,
  url: URL,
  supabase: ReturnType<typeof createServerClient<Database>>,
  pending: PendingCookie[],
  secure: boolean,
): Promise<Response> {
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  let kind: 'signup' | 'recovery' | 'oauth' = 'oauth';
  if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) {
      return finish(request, 'link', '/connexion?erreur=lien', 400, pending);
    }
    kind = 'oauth';
  } else if (
    tokenHash &&
    (type === 'signup' || type === 'email' || type === 'recovery')
  ) {
    const verified = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type:
        type === 'recovery'
          ? 'recovery'
          : type === 'signup'
            ? 'signup'
            : 'email',
    });
    if (verified.error) {
      const page =
        type === 'recovery'
          ? '/reinitialisation?erreur=lien'
          : '/connexion?erreur=lien';
      return finish(request, 'link', page, 400, pending);
    }
    kind = type === 'recovery' ? 'recovery' : 'signup';
  } else {
    return finish(request, 'link', '/connexion?erreur=lien', 400, pending);
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const page =
      kind === 'recovery'
        ? '/reinitialisation?erreur=lien'
        : '/connexion?erreur=lien';
    return finish(request, 'link', page, 400, pending);
  }
  const profile = await readProfile(supabase, data.user.id);
  await maybeStoreName(supabase, data.user, profile.displayName);
  if (kind === 'signup') {
    await supabase
      .from('profiles')
      .update({ onboarding_vu: true })
      .eq('id', data.user.id);
    await acceptTerms(request, supabase, data.user.id, pending, secure);
  }
  const cookies = readCookies(request.headers.get('cookie') ?? '');
  const storedNext = cookies.find(
    (cookie) => cookie.name === 'audixio_next',
  )?.value;
  pending.push({
    line: serializeCookieHeader('audixio_next', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 0,
    }),
  });
  pending.push({ line: flagCookie(true, secure, true) });
  const target = landingPath({
    kind,
    onboardingVu: kind === 'signup' ? true : profile.onboardingVu,
    providers: providersOf(data.user.app_metadata ?? {}),
    next: storedNext ? decodeURIComponent(storedNext) : null,
  });
  return redirect(new URL(target, url.origin).toString(), 303, pending);
}

async function allow(
  service: ReturnType<typeof createServiceClient>,
  request: Request,
  scope: keyof typeof AUTH_LIMITS,
  email: string,
): Promise<boolean> {
  const rule = AUTH_LIMITS[scope];
  const day = new Date().toISOString().slice(0, 10);
  const ip = await digestHex(`${day}\n${clientIp(request)}`);
  const mail = await digestHex(`${day}\n${email}`);
  const ipOk = await consume(
    service,
    scope,
    `ip\n${ip}`,
    rule.limit,
    rule.windowMs,
  );
  if (!ipOk) return false;
  if (scope === 'signup') return true;
  return consume(service, scope, `mail\n${mail}`, rule.limit, rule.windowMs);
}

async function consume(
  service: ReturnType<typeof createServiceClient>,
  scope: string,
  material: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const key = await digestHex(`audixio\n${scope}\n${material}`);
  const { data, error } = await service.rpc('consume_rate_limit', {
    p_key: key,
    p_window_start: windowStartIso(Date.now(), windowMs),
    p_limit: limit,
  });
  if (error) return false;
  return data === true;
}

async function digestHex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function clientIp(request: Request): string {
  const netlify = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (netlify) return netlify;
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : 'local';
}

function callbackUrl(url: URL): string {
  return `${url.origin}/api/auth/callback`;
}

function codeOf(error: { message: string }): string {
  if ('code' in error && typeof error.code === 'string') return error.code;
  return '';
}

function sessionOnlyCookie(on: boolean, secure: boolean): string {
  const options: CookieOptions = {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure,
  };
  if (!on) options.maxAge = 0;
  return serializeCookieHeader('audixio_session_only', on ? '1' : '', options);
}

function quietResend(message: string, code: string): boolean {
  const text = `${code} ${message}`.toLowerCase();
  return (
    benignSignup(message, code) ||
    text.includes('not found') ||
    text.includes('confirm') ||
    text.includes('otp') ||
    text.includes('user')
  );
}

function benignSignup(message: string, code: string | undefined): boolean {
  const text = `${code ?? ''} ${message}`.toLowerCase();
  return (
    text.includes('already') ||
    text.includes('registered') ||
    text.includes('exists') ||
    text.includes('user_already') ||
    text.includes('over_email_send_rate_limit') ||
    text.includes('for security purposes')
  );
}

function harden(
  options: CookieOptions,
  secure: boolean,
  sessionOnly: boolean,
): CookieOptions {
  const next: CookieOptions = {
    ...options,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure,
  };
  if (sessionOnly && typeof next.maxAge === 'number' && next.maxAge > 0) {
    delete next.maxAge;
  }
  return next;
}

function flagCookie(on: boolean, secure: boolean, persistent: boolean): string {
  const options: CookieOptions = {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure,
  };
  if (!on) options.maxAge = 0;
  else if (persistent) options.maxAge = 400 * 24 * 60 * 60;
  return serializeCookieHeader('audixio_connecte', on ? '1' : '', options);
}

async function rememberChoice(request: Request): Promise<boolean> {
  if (request.method !== 'POST') return true;
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/x-www-form-urlencoded')) return true;
  const text = await request.clone().text();
  return new URLSearchParams(text).get('remember') === 'on';
}

async function readProfile(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<{ onboardingVu: boolean; displayName: string }> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_vu, display_name')
    .eq('id', userId)
    .maybeSingle();
  return {
    onboardingVu: data?.onboarding_vu === true,
    displayName: data?.display_name ?? '',
  };
}

async function maybeStoreName(
  supabase: ReturnType<typeof createServerClient<Database>>,
  user: User,
  current: string,
): Promise<void> {
  if (current.trim().length > 0) return;
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown };
  const name = cleanDisplayName(meta.full_name) || cleanDisplayName(meta.name);
  if (!name) return;
  await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', user.id);
}

async function acceptTerms(
  request: Request,
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  pending: PendingCookie[],
  secure: boolean,
): Promise<void> {
  const cookies = readCookies(request.headers.get('cookie') ?? '');
  const mark = cookies.find((cookie) => cookie.name === 'audixio_cgu')?.value;
  pending.push({
    line: serializeCookieHeader('audixio_cgu', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 0,
    }),
  });
  if (mark !== TERMS_VERSION) return;
  await supabase.from('terms_acceptances').insert({
    user_id: userId,
    version: TERMS_VERSION,
  });
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('application/json');
}

function answer(
  request: Request,
  code: AuthErrorCode | null,
  location: string,
  status: number,
  pending: PendingCookie[],
): Response {
  if (wantsJson(request)) {
    return json(
      { ok: code === null, error: code, redirect: location },
      code === null ? 200 : status,
      pending,
    );
  }
  return redirect(location, 303, pending);
}

function finish(
  request: Request,
  code: AuthErrorCode,
  location: string,
  status: number,
  pending: PendingCookie[],
): Response {
  return answer(request, code, location, status, pending);
}

function json(
  body: unknown,
  status: number,
  pending: PendingCookie[],
): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
  });
  for (const cookie of pending) headers.append('set-cookie', cookie.line);
  return new Response(JSON.stringify(body), { status, headers });
}

function redirect(
  location: string,
  status: number,
  pending: PendingCookie[],
): Response {
  const headers = new Headers({ location });
  for (const cookie of pending) headers.append('set-cookie', cookie.line);
  return new Response(null, { status, headers });
}
