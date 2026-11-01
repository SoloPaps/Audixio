import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import {
  authGuardActive,
  protectedPath,
  safeNextPath,
} from '../../packages/db/src/auth-policy.js';

interface EdgeContext {
  next: () => Promise<Response> | Response;
}

function readEnv(name: string): string {
  const netlify = (
    globalThis as { Netlify?: { env: { get: (key: string) => string } } }
  ).Netlify;
  const fromNetlify = netlify?.env.get(name);
  if (fromNetlify) return fromNetlify;
  if (typeof process !== 'undefined' && process.env[name]) {
    return process.env[name] ?? '';
  }
  return '';
}

/** Même garde que le serveur de dev : /sites, /compte, /bienvenue. */
export default async function handler(
  request: Request,
  context: EdgeContext,
): Promise<Response> {
  const url = new URL(request.url);
  if (!protectedPath(url.pathname)) return context.next();
  const dest = request.headers.get('sec-fetch-dest');
  if (dest && dest !== 'document') return context.next();
  const supabaseUrl = readEnv('SUPABASE_URL');
  const anonKey = readEnv('SUPABASE_ANON_KEY');
  if (!authGuardActive(anonKey) || !supabaseUrl) return context.next();
  const header = request.headers.get('cookie') ?? '';
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(header).flatMap((cookie) =>
          typeof cookie.value === 'string'
            ? [{ name: cookie.name, value: cookie.value }]
            : [],
        );
      },
      setAll() {
        /* lecture seule : la page statique suit */
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) return context.next();
  const next = safeNextPath(`${url.pathname}${url.search}`);
  const login = new URL('/connexion', url.origin);
  login.searchParams.set('next', next);
  return Response.redirect(login, 303);
}
