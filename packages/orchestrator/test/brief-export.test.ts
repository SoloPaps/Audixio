import { describe, expect, it } from 'vitest';
import {
  type AuditView,
  BRIEF_EXPORT_FILENAME,
  type BriefExportDeps,
  type BriefRenderInput,
  type FindingView,
  handleBriefExport,
} from '../src/index.js';
import { AUDIT_ID, captureLogger } from './helpers.js';

const TOKEN = 'a'.repeat(32);
const USER = '11111111-1111-4111-8111-111111111111';
const SECRET = 'JETON-MESURE-SECRET';
const CLIENT_BAIT = 'FUITE-CLIENT-HSTS';

function finding(
  domain: string,
  checkId: string,
  status: string,
  extra: Partial<FindingView> = {},
): FindingView {
  return {
    domain,
    checkId,
    status,
    severity: 3,
    impact: 2,
    score: 0,
    measured: {},
    messageKey: `${checkId}.fail`,
    params: {},
    fixKey: null,
    effortMinutes: null,
    reason: null,
    ...extra,
  };
}

function auditView(
  findings: FindingView[],
  options: { siteVerified?: boolean; status?: string; locked?: string[] } = {},
): AuditView {
  const locked = new Set(options.locked ?? []);
  const audit: AuditView['audit'] = {
    id: AUDIT_ID,
    status: options.status ?? 'done',
    mode: 'passive',
    trigger: 'manual',
    methodVersion: '2026.1',
    engineVersion: '0.15.0',
    globalScore: 72,
    coverage: 1,
    createdAt: '2026-10-23T12:00:00.000Z',
    startedAt: '2026-10-23T12:00:01.000Z',
    finishedAt: '2026-10-23T12:30:00.000Z',
    error: null,
    site: {
      id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
      url: 'https://exemple.fr/chemin',
      label: 'exemple.fr',
      scope: 'origin',
      hosting: 'other',
    },
  };
  if (options.siteVerified !== undefined) {
    audit.siteVerified = options.siteVerified;
  }
  return {
    audit,
    domains: [
      { domain: 'performance', score: 80, coverage: 1, level: 'improve' },
      {
        domain: 'securite',
        score: locked.has('securite') ? null : 40,
        coverage: 1,
        level: locked.has('securite') ? 'locked' : 'problem',
        locked: locked.has('securite'),
      },
    ],
    findings,
  };
}

function deps(
  view: AuditView | null,
  render: BriefExportDeps['render'] = (input) =>
    input.items.map((item) => `${item.mode}:${item.title}`).join('\n'),
  viewer: BriefExportDeps['viewerFor'] = (current) => ({
    kind: 'account',
    plan: 'free',
    siteVerified: current.audit.siteVerified === true,
  }),
): {
  deps: BriefExportDeps;
  labeled: string[];
  rendered: BriefRenderInput[];
} {
  const { logger } = captureLogger([TOKEN, SECRET, CLIENT_BAIT]);
  const labeled: string[] = [];
  const rendered: BriefRenderInput[] = [];
  return {
    labeled,
    rendered,
    deps: {
      logger,
      userFromToken: async (token) => (token === TOKEN ? USER : null),
      readAudit: async () => view,
      viewerFor: viewer,
      label(finding) {
        labeled.push(finding.checkId);
        return {
          title: `titre-${finding.checkId}`,
          proof: `preuve-${finding.checkId}`,
        };
      },
      render(input) {
        rendered.push(input);
        return render(input);
      },
    },
  };
}

function call(
  pathId: string | undefined,
  init: {
    method?: string;
    token?: string | null;
    body?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (init.token !== null) {
    headers.set('authorization', `Bearer ${init.token ?? TOKEN}`);
  }
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  const request: RequestInit = {
    method: init.method ?? 'POST',
    headers,
  };
  if (init.body !== undefined) request.body = init.body;
  return new Request(
    `http://localhost/api/audits/${pathId ?? AUDIT_ID}/brief`,
    request,
  );
}

const open = finding('performance', 'performance.lcp', 'fail');
const hidden = finding('securite', 'securite.hsts', 'fail', {
  measured: { note: SECRET },
  messageKey: 'securite.hsts.fail',
  fixKey: 'securite.hsts',
  reason: 'reason.hsts',
});

describe('export du brief', () => {
  it('refuse sans jeton, sans recopier le corps', async () => {
    const gate = deps(auditView([open, hidden]));
    const res = await handleBriefExport(
      call(AUDIT_ID, {
        token: null,
        body: JSON.stringify({
          selection: [
            { checkId: 'securite.hsts', mode: 'fix', proof: CLIENT_BAIT },
          ],
        }),
      }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(401);
    const body = await res.text();
    expect(body).not.toContain(CLIENT_BAIT);
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('securite.hsts');
    expect(gate.labeled).toEqual([]);
  });

  it('refuse un jeton inconnu', async () => {
    const gate = deps(auditView([open]));
    const res = await handleBriefExport(
      call(AUDIT_ID, { token: 'a'.repeat(20) }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(401);
    expect(gate.labeled).toEqual([]);
  });

  it('refuse une autre méthode', async () => {
    const gate = deps(auditView([open]));
    const res = await handleBriefExport(
      call(AUDIT_ID, { method: 'PUT', body: '{}' }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, POST');
  });

  it('refuse un identifiant illisible', async () => {
    const gate = deps(auditView([open]));
    const res = await handleBriefExport(
      call('pas-un-id', { method: 'GET' }),
      gate.deps,
      'pas-un-id',
    );
    expect(res.status).toBe(400);
  });

  it('refuse un audit absent ou encore en cours', async () => {
    const missing = deps(null);
    expect(
      (
        await handleBriefExport(
          call(AUDIT_ID, { method: 'GET' }),
          missing.deps,
          AUDIT_ID,
        )
      ).status,
    ).toBe(404);
    const running = deps(auditView([open], { status: 'running' }));
    expect(
      (
        await handleBriefExport(
          call(AUDIT_ID, { method: 'GET' }),
          running.deps,
          AUDIT_ID,
        )
      ).status,
    ).toBe(404);
    expect(running.labeled).toEqual([]);
  });

  it('refuse le brief quand la matrice le ferme', async () => {
    const gate = deps(
      auditView([open, hidden], { siteVerified: true }),
      undefined,
      () => ({
        kind: 'link_public',
      }),
    );
    const res = await handleBriefExport(
      call(AUDIT_ID, {
        body: JSON.stringify({
          selection: [
            { checkId: 'securite.hsts', mode: 'fix', proof: CLIENT_BAIT },
          ],
        }),
      }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'forbidden',
      messageKey: 'api.error.forbidden',
    });
    expect(gate.labeled).toEqual([]);
  });

  it('n’exporte pas les domaines verrouillés ni les données mesurées', async () => {
    const gate = deps(auditView([open, hidden], { siteVerified: false }));
    const res = await handleBriefExport(
      call(AUDIT_ID, {
        body: JSON.stringify({
          selection: [
            { checkId: 'performance.lcp', mode: 'verif', title: CLIENT_BAIT },
            { checkId: 'securite.hsts', mode: 'fix', proof: SECRET },
          ],
        }),
      }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-disposition')).toBe(
      `attachment; filename="${BRIEF_EXPORT_FILENAME}"`,
    );
    const markdown = await res.text();
    expect(markdown).toContain('titre-performance.lcp');
    expect(markdown).not.toContain('securite.hsts');
    expect(markdown).not.toContain(SECRET);
    expect(markdown).not.toContain(CLIENT_BAIT);
    expect(markdown).not.toContain(AUDIT_ID);
    expect(gate.labeled).toEqual(['performance.lcp']);
    expect(gate.rendered[0]?.level).toBe('partiel');
    expect(gate.rendered[0]?.items.map((item) => item.checkId)).toEqual([
      'performance.lcp',
    ]);
    expect(JSON.stringify(gate.rendered[0])).not.toContain(SECRET);
  });

  it('retire aussi un domaine marqué verrouillé sur un site vérifié', async () => {
    const gate = deps(
      auditView([open, hidden], { siteVerified: true, locked: ['securite'] }),
    );
    const res = await handleBriefExport(
      call(AUDIT_ID, { method: 'GET' }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(200);
    expect(gate.labeled).toEqual(['performance.lcp']);
    expect(gate.rendered[0]?.level).toBe('complet');
    expect(await res.text()).not.toContain('securite.hsts');
  });

  it('livre le brief complet quand le site est vérifié', async () => {
    const gate = deps(auditView([open, hidden], { siteVerified: true }));
    const res = await handleBriefExport(
      call(AUDIT_ID, { method: 'GET' }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(200);
    expect(gate.rendered[0]?.level).toBe('complet');
    expect(gate.labeled).toEqual(['performance.lcp', 'securite.hsts']);
    const markdown = await res.text();
    expect(markdown).toContain('titre-securite.hsts');
    expect(markdown).not.toContain(SECRET);
  });

  it('prend les échecs et alertes par défaut, pas un corps vide', async () => {
    const pass = finding('seo', 'seo.canonical', 'pass');
    const warn = finding('ecologie', 'ecologie.poids', 'warn');
    const gate = deps(auditView([open, warn, pass, hidden]));
    const res = await handleBriefExport(
      call(AUDIT_ID, { method: 'GET' }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(200);
    expect(
      gate.rendered[0]?.items.map((item) => `${item.mode}:${item.checkId}`),
    ).toEqual(['fix:performance.lcp', 'verif:ecologie.poids']);
    const empty = deps(auditView([open, hidden]));
    const posted = await handleBriefExport(
      call(AUDIT_ID, { body: JSON.stringify({ selection: [] }) }),
      empty.deps,
      AUDIT_ID,
    );
    expect(posted.status).toBe(200);
    expect(empty.rendered[0]?.items).toEqual([]);
    expect(await posted.text()).not.toContain('performance.lcp');
  });

  it('bloque un rendu qui réintroduit un constat retiré', async () => {
    const gate = deps(auditView([open, hidden]), () => 'fuite securite.hsts');
    const res = await handleBriefExport(
      call(AUDIT_ID, { method: 'GET' }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain('securite.hsts');
    expect(body).not.toContain(SECRET);
  });

  it('refuse un corps trop gros', async () => {
    const gate = deps(auditView([open]));
    const res = await handleBriefExport(
      call(AUDIT_ID, { body: `{"selection":"${'a'.repeat(70_000)}"}` }),
      gate.deps,
      AUDIT_ID,
    );
    expect(res.status).toBe(400);
    expect(gate.labeled).toEqual([]);
  });
});
