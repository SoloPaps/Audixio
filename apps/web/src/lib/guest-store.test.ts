import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import { readGuestAudit, saveGuestAudit } from './guest-store.js';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

function installer(): void {
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
}

function payload(id: string): AuditPayload {
  return {
    audit: {
      id,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: null,
      coverage: null,
      createdAt: '2026-11-03T00:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      error: null,
      site: {
        id: `site-${id}`,
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'unknown',
      },
    },
    domains: [],
    findings: [],
  };
}

describe('audits anonymes', () => {
  it('relit un rapport plus ancien, pas seulement le dernier', () => {
    installer();
    const premier = payload('aaaa');
    const second = payload('bbbb');
    saveGuestAudit(premier);
    saveGuestAudit(second);
    expect(readGuestAudit('bbbb')?.audit.id).toBe('bbbb');
    expect(readGuestAudit('aaaa')?.audit.id).toBe('aaaa');
  });

  it('relit l’ancien format à une seule entrée', () => {
    installer();
    const seul = payload('cccc');
    store.set('audixio-guest-audit', JSON.stringify(seul));
    expect(readGuestAudit('cccc')?.audit.site.url).toBe('https://exemple.fr');
    expect(readGuestAudit('autre')).toBeNull();
  });
});
