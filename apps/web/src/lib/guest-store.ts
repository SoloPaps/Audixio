import type { AuditPayload } from './audit-api.js';

const KEY = 'audixio-guest-audit';

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function saveGuestAudit(payload: AuditPayload): void {
  storage()?.setItem(KEY, JSON.stringify(payload));
}

export function readGuestAudit(id: string): AuditPayload | null {
  const raw = storage()?.getItem(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as AuditPayload;
    if (value?.audit?.id !== id) return null;
    if (!Array.isArray(value.findings) || !Array.isArray(value.domains)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
