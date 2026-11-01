import { authConfigured } from './public-config.js';

/** Même clé que la session Supabase. Jamais un secret dans le code. */
export const AUTH_STORAGE_KEY = 'audigy-auth';

export interface StoredAccess {
  access_token: string;
  expires_at?: number;
  userId: string;
  email?: string;
}

/** Jeton laissé par un ancien essai navigateur. Les nouveaux comptes passent par le cookie. */
export function storedAccessToken(): StoredAccess | null {
  if (!authConfigured()) return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      expires_at?: unknown;
      user?: { id?: unknown; email?: unknown };
    };
    if (typeof parsed.access_token !== 'string' || parsed.access_token === '') {
      return null;
    }
    if (
      typeof parsed.expires_at === 'number' &&
      parsed.expires_at * 1000 <= Date.now()
    ) {
      return null;
    }
    const userId = parsed.user?.id;
    if (typeof userId !== 'string' || userId === '') return null;
    const email = parsed.user?.email;
    const stored: StoredAccess = {
      access_token: parsed.access_token,
      userId,
    };
    if (typeof parsed.expires_at === 'number')
      stored.expires_at = parsed.expires_at;
    if (typeof email === 'string') stored.email = email;
    return stored;
  } catch {
    return null;
  }
}

/** Vrai si le navigateur a déjà une session utilisable, sans client Supabase. */
export function storedSessionPresent(): boolean {
  if (!authConfigured()) return false;
  try {
    const cookie = (globalThis as { document?: { cookie?: string } }).document
      ?.cookie;
    if (cookie?.split('; ').includes('audixio_connecte=1')) return true;
  } catch {
    /* document absent */
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      expires_at?: unknown;
    };
    if (typeof parsed.access_token !== 'string' || parsed.access_token === '') {
      return false;
    }
    if (
      typeof parsed.expires_at === 'number' &&
      parsed.expires_at * 1000 <= Date.now()
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
