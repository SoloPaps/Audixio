import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import { readLocalShare, saveLocalShare } from './local-share.js';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

function payload(): AuditPayload {
  return {
    audit: {
      id: 'aaaa',
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: 80,
      coverage: null,
      createdAt: '2026-11-03T00:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      error: null,
      site: {
        id: 'site',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'unknown',
      },
    },
    domains: [{ domain: 'seo', score: 80, coverage: 1, level: 'good' }],
    findings: [],
  };
}

describe('lien sans compte', () => {
  it('retrouve le rapport déposé sous le jeton', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
    saveLocalShare('ab'.repeat(16), payload());
    expect(readLocalShare('ab'.repeat(16))?.audit.globalScore).toBe(80);
    expect(readLocalShare('cd'.repeat(16))).toBeNull();
  });
});
