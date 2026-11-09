import type { BriefExportDeps, FindingView } from '@audigy/orchestrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

// QA Mo 05/11 M6 (bug_c604b173) : /brief en anglais, « Download (.md) »
// donnait un fichier français. La fonction Netlify ignorait la langue
// envoyée par le navigateur (`x-audigy-locale`).

const seen: BriefExportDeps[] = [];

vi.mock('@audigy/orchestrator', async (original) => ({
  ...(await original<typeof import('@audigy/orchestrator')>()),
  apiDepsFromEnv: () => ({
    userFromToken: async () => null,
    readAudit: async () => null,
  }),
  serve: async (_logger: unknown, run: () => Promise<Response>) => run(),
  handleBriefExport: async (_req: Request, deps: BriefExportDeps) => {
    seen.push(deps);
    return new Response('ok');
  },
}));

const finding: FindingView = {
  domain: 'seo',
  checkId: 'seo.description',
  status: 'warn',
  severity: 2,
  impact: 2,
  score: null,
  measured: {},
  messageKey: 'seo.description.warn_missing',
  params: {},
  fixKey: 'seo.description',
  effortMinutes: 5,
  reason: null,
};

async function depsFor(locale: string | null): Promise<BriefExportDeps> {
  const { default: handler } = await import(
    '../../../../netlify/functions/api-audits-brief.js'
  );
  const headers = new Headers({ authorization: 'Bearer jeton' });
  if (locale) headers.set('x-audigy-locale', locale);
  await handler(
    new Request('http://127.0.0.1:8888/api/audits/a/brief', {
      method: 'POST',
      headers,
      body: '{}',
    }),
    { params: { id: 'a' } },
  );
  const deps = seen.at(-1);
  if (!deps) throw new Error('handleBriefExport non appelé');
  return deps;
}

function rendered(deps: BriefExportDeps): string {
  const viewer = { kind: 'account', plan: 'free', siteVerified: true } as const;
  const label = deps.label(finding, viewer);
  return deps.render({
    level: 'complet',
    url: 'https://bon.audigy.test',
    at: '2026-11-05T22:00:00.000Z',
    items: [{ checkId: finding.checkId, mode: 'fix', ...label }],
  });
}

afterEach(() => {
  seen.length = 0;
});

describe('M6 — fichier du brief dans la langue de l’interface (Netlify)', () => {
  it('interface anglaise : le fichier .md est entièrement en anglais', async () => {
    const md = rendered(await depsFor('en'));
    expect(md).toContain('Audixio Brief — complete (verified site)');
    expect(md).toContain('Findings');
    expect(md).toContain('Guardrails');
    expect(md).not.toMatch(
      /COMPLET|Site vérifié|Constats|Garde-fous|Corriger|Vérif\b|Rôle|Statut :/,
    );
  });

  it('interface française : le fichier reste en français', async () => {
    const md = rendered(await depsFor(null));
    expect(md).toContain('Constats');
    expect(md).toContain('Garde-fous');
  });
});
