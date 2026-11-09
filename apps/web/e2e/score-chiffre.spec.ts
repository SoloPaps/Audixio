import { expect, type Page, test } from '@playwright/test';
import { stubFreeSites } from './sites-gratuit.js';

/** Vue du navigateur, sans le DOM de TypeScript. */
type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

/**
 * Le score chiffré accompagne la lettre là où seule la lettre s’affichait :
 * domaines du rapport (chiffre seul, la barre donne l’échelle), carte de note
 * d’un domaine, voisins d’un domaine verrouillé, PDF (couverture + tableau) et
 * mesure Sécurité de /sites (format « 58/100 »).
 */

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';
const SITE_ID = '00000000-0000-4000-8000-0000000000bb';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

function auditBody(verified: boolean): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 74,
      siteVerified: verified,
      partialLabel: verified ? null : 'partielle · site non vérifié',
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: SITE_ID,
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 88, coverage: 1, level: 'good' },
      {
        domain: 'securite',
        score: verified ? 62 : null,
        coverage: 1,
        level: verified ? 'improve' : 'locked',
        locked: !verified,
      },
      { domain: 'ecologie', score: 71, coverage: 1, level: 'improve' },
    ],
    findings: [
      {
        domain: 'performance',
        checkId: 'performance.poids',
        status: 'fail',
        severity: 4,
        impact: 3,
        score: 0,
        measured: {},
        messageKey: 'performance.poids.fail',
        params: {},
        fixKey: null,
        effortMinutes: 20,
        reason: null,
      },
    ],
  };
}

async function install(page: Page, verified = true): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody(verified)),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('action_plan') ? '[]' : 'null',
    });
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`rapport : chaque domaine noté montre son score sur 100 (${theme})`, async ({
    page,
  }) => {
    await install(page);
    await page.goto(`/rapport?id=${AUDIT_ID}&theme=${theme}`);
    const perf = page.locator('#domaine-performance');
    await expect(perf.locator('[data-score-num]')).toHaveText('58');
    await expect(perf.locator('.grade')).toHaveText('D');
    await expect(page.locator('#domaine-securite [data-score-num]')).toHaveText(
      '62',
    );
    // Un domaine sans mesure ne montre ni chiffre ni lettre.
    await expect(page.locator('#domaine-qualite [data-score-num]')).toHaveCount(
      0,
    );
  });

  test(`domaine : la carte de note donne lettre et score (${theme})`, async ({
    page,
  }) => {
    await install(page);
    await page.goto(
      `/domaine?id=${AUDIT_ID}&domaine=performance&theme=${theme}`,
    );
    const card = page.locator('.gcard');
    await expect(card.locator('.gbig')).toHaveText('D');
    await expect(card.locator('[data-score-num]')).toHaveText('58/100');
    const color = await card
      .locator('[data-score-num]')
      .evaluate(
        (node) => (globalThis as unknown as View).getComputedStyle(node).color,
      );
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });
}

test('domaine verrouillé : les voisins montrent lettre et score', async ({
  page,
}) => {
  await install(page, false);
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=securite&theme=light`);
  const prev = page.locator('.pg.prev');
  const next = page.locator('.pg.next');
  await expect(prev.locator('[data-score-num]')).toHaveText('88/100');
  await expect(prev.locator('.grade')).toContainText('B');
  await expect(next.locator('[data-score-num]')).toHaveText('71/100');
  await expect(next.locator('.grade')).toContainText('C');
});

test('PDF : la couverture et le tableau donnent le score sur 100', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (globalThis as unknown as { print: () => void }).print = () => {};
  });
  await install(page);
  await page.goto(`/rapport/${AUDIT_ID}/imprimer`);
  await expect(page.locator('.bigg [data-score-num]')).toHaveText('74/100');
  await expect(page.locator('.bigg .gr')).toHaveText('C');
  await expect(page.locator('.tbl [data-score-num]').first()).toHaveText(
    '62/100',
  );
});

test('/sites : la mesure Sécurité montre le score à côté de la lettre', async ({
  page,
}) => {
  await stubFreeSites(page);
  const audit = {
    id: AUDIT_ID,
    site_id: SITE_ID,
    status: 'done',
    finished_at: '2026-10-23T12:00:00.000Z',
    created_at: '2026-10-23T11:00:00.000Z',
  };
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/rest/v1/sites')) {
      // Un vrai site (les deux hôtes de stubFreeSites sont ceux de la démo).
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: SITE_ID,
            url: 'https://atelier-martin.fr',
            label: 'atelier-martin.fr',
            host: 'atelier-martin.fr',
            owner_id: session.user.id,
            is_public: false,
            public_slug: null,
            expose_security: false,
          },
        ]),
      });
      return;
    }
    if (path.endsWith('/rest/v1/audits')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([audit]),
      });
      return;
    }
    if (path.endsWith('/rest/v1/rpc/read_rapport_apercu')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          score_global: 74,
          note_globale: 'C',
          site_verifie: true,
          domaines: [
            { domaine: 'securite', verrouille: false, note: 'D', score: 62 },
            { domaine: 'ecologie', verrouille: false, note: 'C', score: 71 },
          ],
        }),
      });
      return;
    }
    await route.fallback();
  });
  await page.goto('/sites?theme=light');
  const site = page.locator('article.beam').first();
  await expect(site.locator('.met [data-score-num]')).toHaveText('62/100');
});

/**
 * CI #177 : le parcours visiteur (guest-audit.spec) refuse tout « 0/100 » sur
 * le rapport. Avec « 80/100 » sur une carte de domaine, getByText('0/100')
 * (recherche par sous-chaîne) trouvait un vrai score se terminant par 0.
 * Les cartes du rapport montrent le chiffre seul : aucun « …0/100 ».
 */
test('rapport visiteur partiel : scores ronds sans « 0/100 »', async ({
  page,
}) => {
  const id = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a11';
  const row = (name: string, score: number | null, locked = false) => ({
    domain: name,
    score,
    coverage: score === null ? 0 : 1,
    level: score === null ? 'untested' : 'good',
    locked,
  });
  const payload = {
    audit: {
      id,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: null,
      siteVerified: false,
      partialLabel: 'partielle · 5 domaines · site non vérifié',
      coverage: 0.6,
      createdAt: '2026-11-03T00:00:00.000Z',
      startedAt: '2026-11-03T00:00:00.000Z',
      finishedAt: '2026-11-03T00:00:01.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123457',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'unknown',
      },
    },
    domains: [
      row('performance', 80),
      row('seo', 70),
      row('securite', null, true),
      row('ecologie', 60),
      row('accessibilite', 50),
      row('qualite', 100),
      row('vie_privee', null, true),
      row('dns_email', null, true),
    ],
    findings: [],
  };
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        sessionStorage: { setItem: (key: string, value: string) => void };
      }
    ).sessionStorage;
    storage.setItem(
      'audixio-guest-audit',
      JSON.stringify({ [value.audit.id]: value }),
    );
  }, payload);
  await page.goto(`/rapport?id=${id}`);
  await expect(
    page.getByText(/partielle · \d+ domaines · site non vérifié/),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator('#domaine-performance [data-score-num]'),
  ).toHaveText('80');
  await expect(page.locator('#domaine-qualite [data-score-num]')).toHaveText(
    '100',
  );
  await expect(page.locator('#domaine-securite [data-score-num]')).toHaveCount(
    0,
  );
  await expect(page.getByText('0/100')).toHaveCount(0);
});
