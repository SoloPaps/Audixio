import { seesFullReport } from '@audigy/db';
import {
  type AuditView,
  type BriefExportDeps,
  type FindingView,
  handleBriefExport,
  type Logger,
} from '@audigy/orchestrator';
import { describe, expect, it } from 'vitest';
import { labelBriefFinding } from './brief-deps.js';

function finding(domain: string, checkId: string): FindingView {
  return {
    domain,
    checkId,
    status: 'fail',
    severity: 3,
    impact: 2,
    score: 0,
    measured: { note: 'JETON-MESURE-SECRET' },
    messageKey: 'performance.lcp.fail',
    params: { detail: 'JETON-MESURE-SECRET' },
    fixKey: checkId,
    effortMinutes: null,
    reason: null,
  };
}

describe('libellé serveur du brief', () => {
  it('ne révèle pas un domaine verrouillé', () => {
    const line = labelBriefFinding(finding('securite', 'securite.hsts'));
    expect(line.title).toBe('Constat relevé sur ce site.');
    expect(line.proof).not.toContain('JETON');
    expect(line.proof).not.toContain('securite');
  });

  it('traduit un domaine ouvert sans la mesure brute', () => {
    const line = labelBriefFinding(finding('performance', 'performance.lcp'));
    expect(line.title.length).toBeGreaterThan(0);
    expect(line.title).not.toContain('JETON-MESURE-SECRET');
    expect(line.proof).not.toContain('JETON-MESURE-SECRET');
  });
});

describe('brief .md d’un site vérifié (QA Mo M6)', () => {
  const view = (verified: boolean): AuditView => ({
    audit: {
      id: '00000000-0000-4000-8000-0000000000b5',
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 86,
      coverage: 1,
      createdAt: '2026-11-04T10:00:00.000Z',
      startedAt: '2026-11-04T10:00:01.000Z',
      finishedAt: '2026-11-04T10:05:00.000Z',
      error: null,
      siteVerified: verified,
      site: {
        id: '00000000-0000-4000-8000-0000000000b2',
        url: 'https://bon.audigy.test/',
        label: 'Exemple vérifié',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [{ domain: 'securite', score: 60, coverage: 1, level: 'improve' }],
    findings: [
      {
        ...finding('securite', 'securite.frames'),
        messageKey: 'securite.frames.fail',
        params: {},
        measured: {},
      },
      {
        ...finding('securite', 'securite.hsts'),
        status: 'warn',
        messageKey: 'securite.hsts.warn_short',
        params: {},
        measured: {},
      },
    ],
  });

  async function exportMd(verified: boolean): Promise<Response> {
    const deps: BriefExportDeps = {
      logger: { info() {}, warn() {}, error() {} } as unknown as Logger,
      userFromToken: async () => '11111111-1111-4111-8111-111111111111',
      readAudit: async () => view(verified),
      viewerFor: (current) => ({
        kind: 'account',
        plan: 'pro',
        siteVerified: current.audit.siteVerified === true,
      }),
      label: (item, viewer) =>
        labelBriefFinding(item, 'fr', seesFullReport(viewer)),
      render: (input) =>
        input.items.map((item) => `${item.title} | ${item.proof}`).join('\n'),
    };
    const request = new Request(
      'http://127.0.0.1/api/audits/00000000-0000-4000-8000-0000000000b5/brief',
      {
        method: 'get'.toUpperCase(),
        headers: { authorization: `Bearer ${'a'.repeat(32)}` },
      },
    );
    return handleBriefExport(
      request,
      deps,
      '00000000-0000-4000-8000-0000000000b5',
    );
  }

  it('garde les titres et preuves Sécurité, pas le texte générique', async () => {
    const response = await exportMd(true);
    expect(response.status).toBe(200);
    const markdown = await response.text();
    expect(markdown).not.toContain('Constat relevé sur ce site.');
    expect(markdown).toContain(
      'Une autre page peut afficher la vôtre dans un cadre trompeur.',
    );
    expect(markdown).toContain(
      'La protection contre l’adresse non chiffrée dure moins de six mois.',
    );
  });

  it('libellé ouvert seulement si le lecteur voit le rapport complet', () => {
    const line = labelBriefFinding(
      {
        ...finding('securite', 'securite.frames'),
        messageKey: 'securite.frames.fail',
        params: {},
      },
      'fr',
      true,
    );
    expect(line.title).toBe(
      'Une autre page peut afficher la vôtre dans un cadre trompeur.',
    );
    expect(
      labelBriefFinding(finding('securite', 'securite.frames'), 'fr', false)
        .title,
    ).toBe('Constat relevé sur ce site.');
  });
});
