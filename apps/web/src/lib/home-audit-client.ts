import type { AuditPayload } from './audit-api.js';
import { storedAccessToken } from './auth-storage.js';
import { t } from './home-audit-copy.js';

export type HomeLaunch =
  | { ok: true; auditId: string; guest: AuditPayload | null }
  | { ok: false; limit: boolean; message: string };

function textFor(key: string): string {
  if (key === 'api.error.host_limit') return t('api.error.host_limit');
  if (key === 'api.error.invalid_url') return t('api.error.invalid_url');
  if (key === 'api.error.invalid_input') return t('api.error.invalid_input');
  if (key === 'api.error.user_limit') return t('api.error.user_limit');
  if (key === 'api.error.unauthorized') return t('api.error.unauthorized');
  if (key === 'api.error.guest_limit') return t('api.error.guest_limit');
  if (key === 'api.error.site_limit') return t('api.error.site_limit');
  return t('api.error.internal');
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object') return t('api.error.internal');
  const key = (body as { messageKey?: unknown }).messageKey;
  return textFor(typeof key === 'string' ? key : '');
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function accessToken(): Promise<string | null> {
  const stored = storedAccessToken();
  if (stored) return stored.access_token;
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { access_token?: unknown };
    return typeof body.access_token === 'string' && body.access_token !== ''
      ? body.access_token
      : null;
  } catch {
    return null;
  }
}

function isPayload(value: unknown): value is AuditPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as { audit?: { id?: unknown }; findings?: unknown };
  return typeof record.audit?.id === 'string' && Array.isArray(record.findings);
}

/** Lancement depuis l’accueil, sans le dictionnaire complet ni le client Supabase. */
export async function launchFromHome(url: string): Promise<HomeLaunch> {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(token ? '/api/audits' : '/api/guest-audits', {
      method: 'post'.toUpperCase(),
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    return { ok: false, limit: false, message: t('api.error.internal') };
  }
  const body = await readBody(response);
  if (!token && response.status === 429) {
    const code =
      body && typeof body === 'object'
        ? (body as { error?: unknown }).error
        : '';
    if (code === 'guest_limit') {
      return { ok: false, limit: true, message: t('api.error.guest_limit') };
    }
  }
  if (response.ok && body && typeof body === 'object') {
    if (token) {
      const auditId = (body as { auditId?: unknown }).auditId;
      if (typeof auditId === 'string' && auditId !== '') {
        return { ok: true, auditId, guest: null };
      }
    } else {
      const view = (body as { view?: unknown }).view;
      if (isPayload(view)) {
        return { ok: true, auditId: view.audit.id, guest: view };
      }
    }
  }
  return { ok: false, limit: false, message: messageFromBody(body) };
}
