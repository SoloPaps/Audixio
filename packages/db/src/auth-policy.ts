/** Règles d'auth sans réseau. Importables par le navigateur et les tests. */

export const TEST_ANON_KEY = 'test-anon-key-not-a-secret';
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

export const AUTH_LIMITS = {
  signin: { limit: 8, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  reset: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

/** Inscription comprise : IP et e-mail. Le message ne dit pas si l’adresse existe. */
export function authRateParts(
  scope: keyof typeof AUTH_LIMITS,
): readonly ('ip' | 'mail')[] {
  void scope;
  return ['ip', 'mail'];
}

export type AuthErrorCode =
  | 'invalid_email'
  | 'invalid_password'
  | 'invalid_credentials'
  | 'mismatch'
  | 'terms_required'
  | 'rate_limited'
  | 'unavailable'
  | 'oauth'
  | 'link';

/** Domaine à point, ou l’hôte seul `localhost` (comptes du labo). */
const EMAIL = /^[^\s@]+@(?:localhost|[^\s@]+\.[^\s@]+)$/iu;

/** Chemin interne seulement. Refuse une redirection ouverte. */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = '/sites',
): string {
  if (!raw) return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  if (raw.includes('://')) return fallback;
  if (raw.includes('\n') || raw.includes('\r')) return fallback;
  if (raw.includes('%')) return fallback;
  return raw;
}

/** Cookie `audixio_next`. Un pourcent mal formé ne casse pas le retour OAuth. */
export function readStoredNext(raw: string | null | undefined): string {
  if (!raw) return '/sites';
  try {
    return safeNextPath(decodeURIComponent(raw));
  } catch {
    return '/sites';
  }
}

export function validEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (email.length > 254) return false;
  if (EMAIL.test(email)) return true;
  return /^[^\s@]+@localhost$/u.test(email);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX;
}

/** Vrai quand une clé anon réelle est là. La clé des tests Playwright est ignorée. */
export function authGuardActive(anonKey: string | undefined): boolean {
  return Boolean(anonKey) && anonKey !== TEST_ANON_KEY;
}

/** Pages qui exigent une session. Le retour de lien reste public. */
export function protectedPath(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  if (path === '/sites' || path === '/compte' || path === '/bienvenue')
    return true;
  // Page d’un site (`/sites/:host`) et son résolveur (`/sites/id/:site`).
  // Les pages de démonstration plus profondes (`/sites/:host/demandes/:id`) restent ouvertes.
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'sites') return false;
  return parts.length === 2 || (parts.length === 3 && parts[1] === 'id');
}

export function shouldShowWelcome(input: {
  onboardingVu: boolean;
  providers: readonly string[];
}): boolean {
  if (input.onboardingVu) return false;
  return input.providers.some(
    (provider) => provider === 'google' || provider === 'github',
  );
}

export function landingPath(input: {
  kind: 'signup' | 'recovery' | 'oauth';
  onboardingVu: boolean;
  providers: readonly string[];
  next: string | null;
}): string {
  if (input.kind === 'signup') return '/email-confirme';
  if (input.kind === 'recovery') return '/reinitialisation?etape=nouveau';
  if (
    shouldShowWelcome({
      onboardingVu: input.onboardingVu,
      providers: input.providers,
    })
  ) {
    return '/bienvenue';
  }
  return safeNextPath(input.next, '/sites');
}

export function windowStartIso(nowMs: number, windowMs: number): string {
  const start = Math.floor(nowMs / windowMs) * windowMs;
  return new Date(start).toISOString();
}

export function providersOf(meta: {
  provider?: unknown;
  providers?: unknown;
}): string[] {
  if (Array.isArray(meta.providers)) {
    return meta.providers.filter(
      (item): item is string => typeof item === 'string',
    );
  }
  return typeof meta.provider === 'string' ? [meta.provider] : [];
}

export function cleanDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  let cleaned = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 32) cleaned += char;
  }
  return cleaned.trim().slice(0, 80);
}
