import { describe, expect, it } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import { buildPdfReport } from './pdf-report.js';

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';

function finding(input: {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  impact: number;
  messageKey: string;
  reason?: string;
}): AuditPayload['findings'][number] {
  return {
    domain: input.domain,
    checkId: input.checkId,
    status: input.status,
    severity: input.severity,
    impact: input.impact,
    score: input.status === 'pass' ? 100 : 0,
    measured: {},
    messageKey: input.messageKey,
    params: {},
    fixKey: null,
    effortMinutes: 10,
    reason: input.reason ?? null,
  };
}

function payload(verified: boolean): AuditPayload {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 84,
      siteVerified: verified,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:00.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'securite', score: 84, coverage: 1, level: 'good' },
      { domain: 'performance', score: 68, coverage: 1, level: 'improve' },
      { domain: 'accessibilite', score: 82, coverage: 1, level: 'good' },
      { domain: 'seo', score: 95, coverage: 1, level: 'good' },
      { domain: 'vie_privee', score: 55, coverage: 1, level: 'improve' },
      { domain: 'ecologie', score: 66, coverage: 1, level: 'improve' },
      { domain: 'qualite', score: 85, coverage: 1, level: 'good' },
      { domain: 'dns_email', score: 96, coverage: 1, level: 'good' },
    ],
    findings: [
      finding({
        domain: 'vie_privee',
        checkId: 'px.1',
        status: 'fail',
        severity: 4,
        impact: 3,
        messageKey: 'pdf.px.t1',
        reason: 'pdf.px.d1',
      }),
      finding({
        domain: 'securite',
        checkId: 'px.2',
        status: 'fail',
        severity: 3,
        impact: 3,
        messageKey: 'pdf.px.t2',
        reason: 'pdf.px.d2',
      }),
      finding({
        domain: 'performance',
        checkId: 'px.3',
        status: 'fail',
        severity: 3,
        impact: 2,
        messageKey: 'pdf.px.t3',
        reason: 'pdf.px.d3',
      }),
      finding({
        domain: 'accessibilite',
        checkId: 'px.4',
        status: 'warn',
        severity: 2,
        impact: 2,
        messageKey: 'pdf.px.t4',
        reason: 'pdf.px.d4',
      }),
      finding({
        domain: 'ecologie',
        checkId: 'px.5',
        status: 'warn',
        severity: 1,
        impact: 2,
        messageKey: 'pdf.px.t5',
        reason: 'pdf.px.d5',
      }),
      finding({
        domain: 'seo',
        checkId: 'px.pass',
        status: 'pass',
        severity: 5,
        impact: 5,
        messageKey: 'pdf.px.t5',
      }),
      finding({
        domain: 'securite',
        checkId: 'securite.constat',
        status: 'fail',
        severity: 4,
        impact: 1,
        messageKey: 'pdf.px.note.securite',
      }),
      finding({
        domain: 'performance',
        checkId: 'performance.constat',
        status: 'warn',
        severity: 1,
        impact: 1,
        messageKey: 'pdf.px.note.performance',
      }),
      finding({
        domain: 'securite',
        checkId: 'securite.fill.1',
        status: 'fail',
        severity: 1,
        impact: 0,
        messageKey: 'pdf.px.t2',
      }),
      finding({
        domain: 'securite',
        checkId: 'securite.fill.2',
        status: 'fail',
        severity: 1,
        impact: 0,
        messageKey: 'pdf.px.t2',
      }),
      finding({
        domain: 'securite',
        checkId: 'securite.fill.3',
        status: 'fail',
        severity: 1,
        impact: 0,
        messageKey: 'pdf.px.t2',
      }),
    ],
  };
}

describe('buildPdfReport', () => {
  it('classe la couverture, les priorités et les 8 domaines', () => {
    const view = buildPdfReport(payload(true));
    expect(view.host).toBe('atelier-martin.fr');
    expect(view.dateLabel).toBe('28 oct. 2026');
    expect(view.verified).toBe(true);
    expect(view.grade).toBe('B');
    expect(view.critical).toBe(1);
    expect(view.priorities.map((row) => row.tone)).toEqual([
      'crit',
      'fix',
      'fix',
      'check',
      'minor',
    ]);
    expect(view.priorities[0]?.title).toBe(
      'Supprimer les traceurs déposés avant consentement',
    );
    expect(view.priorities[0]?.detail).toBe(
      'Vie privée · 3 scripts publicitaires se chargent avant le choix du visiteur.',
    );
    expect(view.priorities[4]?.title).toBe(
      'Différer les polices non utilisées',
    );
    expect(view.domains.map((row) => row.grade)).toEqual([
      'B',
      'C',
      'B',
      'A',
      'D',
      'C',
      'B',
      'A',
    ]);
    expect(view.domains[0]).toMatchObject({
      label: 'Sécurité',
      note: 'En-têtes HTTPS, HSTS présents ; CSP absente',
      open: 4,
      locked: false,
    });
    expect(view.domains.map((row) => row.label)).toContain('DNS et e-mail');
    expect(view.domains.map((row) => row.label)).not.toContain('Disponibilité');
  });

  it('verrouille les domaines sensibles tant que le site n’est pas vérifié', () => {
    const view = buildPdfReport(payload(false));
    const locked = view.domains
      .filter((row) => row.locked)
      .map((row) => row.id);
    expect(locked).toEqual(['securite', 'vie_privee', 'dns_email']);
    expect(view.domains.find((row) => row.id === 'securite')?.grade).toBeNull();
    expect(view.priorities.map((row) => row.title)).not.toContain(
      'Supprimer les traceurs déposés avant consentement',
    );
    expect(view.critical).toBe(0);
  });
});
