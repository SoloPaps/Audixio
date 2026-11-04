import type { AuditPayload } from './audit-api.js';

const KEY = 'audixio-guest-audit';

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function valid(value: AuditPayload): boolean {
  return (
    typeof value?.audit?.id === 'string' &&
    Array.isArray(value.findings) &&
    Array.isArray(value.domains)
  );
}

function readAll(): Record<string, AuditPayload> {
  const raw = storage()?.getItem(KEY);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as
      | AuditPayload
      | Record<string, AuditPayload>;
    if (value && typeof value === 'object' && 'audit' in value) {
      const one = value as AuditPayload;
      return valid(one) ? { [one.audit.id]: one } : {};
    }
    const out: Record<string, AuditPayload> = {};
    if (!value || typeof value !== 'object') return out;
    for (const [id, item] of Object.entries(value)) {
      if (item?.audit?.id === id && valid(item)) out[id] = item;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGuestAudit(payload: AuditPayload): void {
  const all = readAll();
  if (!valid(payload)) return;
  all[payload.audit.id] = payload;
  storage()?.setItem(KEY, JSON.stringify(all));
}

export function readGuestAudit(id: string): AuditPayload | null {
  return readAll()[id] ?? null;
}
