import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { authGuardActive, protectedPath, safeNextPath } from './auth-policy.js';

export function readCookies(header: string): { name: string; value: string }[] {
  return parseCookieHeader(header).flatMap((cookie) =>
    typeof cookie.value === 'string'
      ? [{ name: cookie.name, value: cookie.value }]
      : [],
  );
}

export interface GuardEnv {
  url: string;
  anonKey: string;
}

/**
 * Redirige vers la connexion si la page est protégée et qu'aucune session
 * valide n'est dans les cookies httpOnly. `null` : laisser passer.
 */
export async function anonymousRedirect(
  request: Request,
  env: GuardEnv | null,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!protectedPath(url.pathname)) return null;
  const dest = request.headers.get('sec-fetch-dest');
  if (dest && dest !== 'document') return null;
  if (!env || !authGuardActive(env.anonKey)) return null;
  const user = await userIdFromCookies(request, env);
  if (user) return null;
  const next = safeNextPath(`${url.pathname}${url.search}`);
  const login = new URL('/connexion', url.origin);
  login.searchParams.set('next', next);
  return Response.redirect(login, 303);
}

export async function userIdFromCookies(
  request: Request,
  env: GuardEnv,
): Promise<string | null> {
  const header = request.headers.get('cookie') ?? '';
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return readCookies(header);
      },
      setAll() {
        /* lecture seule */
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
