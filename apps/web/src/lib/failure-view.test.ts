import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../i18n/format.js';
import type { AuditPayload } from './audit-api.js';
import { failureView } from './failure-view.js';

const AT = '2026-11-04T14:32:00.000Z';

function payload(
  error: string | null,
  finishedAt: string | null,
): AuditPayload {
  return {
    audit: {
      id: '00000000-0000-4000-8000-0000000000b2',
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: null,
      coverage: null,
      createdAt: AT,
      startedAt: AT,
      finishedAt,
      error,
      site: {
        id: 'site-1',
        url: 'https://example.com',
        label: 'example.com',
        scope: 'origin',
        hosting: 'unknown',
      },
    },
    domains: [],
    findings: [],
  };
}

describe('failureView', () => {
  it('nomme le site et l’heure de l’audit, pas la maquette', () => {
    const view = failureView(payload(null, AT));
    expect(view.host).toBe('example.com');
    expect(view.url).toBe('https://example.com');
    expect(view.code).toBe('Aucune mesure');
    expect(view.code).not.toBe('AUDIT_TIMEOUT');
    expect(view.time).toBe(formatDateTime(new Date(AT)));
    expect(view.time).not.toContain('30 oct. 2026');
    expect(view.host).not.toContain('monsite-exemple.fr');
    expect(view.url).not.toContain('monsite-exemple.fr');
    expect(failureView(payload(null, null)).time).toBe(
      formatDateTime(new Date(AT)),
    );
    expect(failureView(payload('engine_error', AT)).code).toBe('engine_error');
  });
});
