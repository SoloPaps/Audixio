import type { AuditPayload } from './audit-api.js';

const KEY = 'audixio-local-shares';

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function valid(value: AuditPayload): boolean {
  return typeof value?.audit?.id === 'string' && Array.isArray(value.domains);
}

export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function saveLocalShare(token: string, payload: AuditPayload): void {
  if (!valid(payload)) return;
  const box = storage();
  if (!box) return;
  const all = readAll();
  all[token] = payload;
  box.setItem(KEY, JSON.stringify(all));
}

export function readLocalShare(token: string): AuditPayload | null {
  return readAll()[token] ?? null;
}

function readAll(): Record<string, AuditPayload> {
  const raw = storage()?.getItem(KEY);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, AuditPayload>;
    const out: Record<string, AuditPayload> = {};
    for (const [token, item] of Object.entries(value)) {
      if (valid(item)) out[token] = item;
    }
    return out;
  } catch {
    return {};
  }
}
