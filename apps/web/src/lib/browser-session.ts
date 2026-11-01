import type { Database } from '@audigy/db';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, storedAccessToken } from './auth-storage.js';
import { authConfigured, publicConfig } from './public-config.js';

export { AUTH_STORAGE_KEY };

let client: SupabaseClient<Database> | null = null;
let cached: { at: number; session: Session } | null = null;

export function browserClient(): SupabaseClient<Database> | null {
  if (!authConfigured()) return null;
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = publicConfig();
  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY,
      flowType: 'pkce',
    },
    accessToken: async () => {
      const session = await currentSession();
      return session?.access_token ?? null;
    },
  });
  return client;
}

async function sessionFromCookie(): Promise<Session | null> {
  if (cached && cached.at > Date.now() - 20_000) return cached.session;
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      access_token?: string;
      expires_at?: number;
      expires_in?: number;
      user?: Session['user'];
    };
    if (!body.access_token || !body.user) return null;
    const session = {
      access_token: body.access_token,
      refresh_token: '',
      expires_in: body.expires_in ?? 3600,
      expires_at: body.expires_at ?? 0,
      token_type: 'bearer',
      user: body.user,
    } as Session;
    cached = { at: Date.now(), session };
    return session;
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<Session | null> {
  const remote = await sessionFromCookie();
  if (remote) return remote;
  const legacy = storedAccessToken();
  if (!legacy) return null;
  return {
    access_token: legacy.access_token,
    refresh_token: '',
    expires_in: 3600,
    expires_at: legacy.expires_at ?? 0,
    token_type: 'bearer',
    user: {
      id: legacy.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: legacy.email,
      app_metadata: {},
      user_metadata: {},
      created_at: '',
    },
  } as Session;
}

export async function signOut(): Promise<void> {
  cached = null;
  try {
    await fetch('/api/auth/deconnexion', {
      method: 'post',
      credentials: 'include',
    });
  } catch {
    /* le cookie local est retiré quand même */
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* pas de stockage */
  }
}
