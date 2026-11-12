import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

// /progression : état terminé pour un audit visiteur « partial » et surtitre
// d’un compte connecté selon que le site est vérifié ou non.

const AUDIT_ID = '2e6f1c80-3b1d-4c55-9a1e-6f0c7d2a9b31';

function payload(status: string, siteVerified: boolean): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status,
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 61,
      siteVerified,
      coverage: 0.6,
      createdAt: '2026-11-05T10:00:00.000Z',
      startedAt: '2026-11-05T10:00:01.000Z',
      finishedAt: '2026-11-05T10:03:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123457',
        url: 'https://partiel.audigy.test',
        label: 'partiel.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 52, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 70, coverage: 1, level: 'improve' },
    ],
    findings: [],
  };
}

async function guestAudit(page: Page, status: string): Promise<void> {
  await page.addInitScript(
    (value) => {
      sessionStorage.setItem('audixio-guest-audit', JSON.stringify(value));
    },
    payload(status, false),
  );
}

for (const lang of ['fr', 'en'] as const) {
  test(`audit visiteur « partial » : la page atteint l’état terminé (${lang})`, async ({
    page,
  }) => {
    await guestAudit(page, 'partial');
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=light');
      await toEnglish(page);
    }
    await page.goto(`/progression?id=${AUDIT_ID}&theme=light`);
    await expect(page.locator('body')).toHaveClass(/\bdone\b/, {
      timeout: 15_000,
    });
    await expect(page.locator('#leadT')).toHaveText(
      lang === 'en'
        ? 'The analysis is finished. Your free preview is ready; the full report and the action plan require an account.'
        : 'L’analyse est terminée. Votre aperçu gratuit est prêt ; le rapport complet et le plan d’action demandent un compte.',
    );
    await expect(page.locator('#ready-slot #reportBtn')).toHaveAttribute(
      'href',
      `/rapport/${AUDIT_ID}`,
    );
  });
}

async function signedInAudit(page: Page, siteVerified: boolean): Promise<void> {
  await stubSession(page, 'free');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload('done', siteVerified)),
    });
  });
}

for (const lang of ['fr', 'en'] as const) {
  test(`compte connecté, site vérifié : « Diagnostic complet · session active » (${lang})`, async ({
    page,
  }) => {
    await signedInAudit(page, true);
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=light');
      await toEnglish(page);
    }
    await page.goto(`/progression?id=${AUDIT_ID}&theme=light`);
    await expect(page.locator('body')).toHaveClass(/\bdone\b/, {
      timeout: 15_000,
    });
    await expect(page.locator('.eyebrow.intro')).toHaveText(
      lang === 'en'
        ? 'Full diagnosis · active session'
        : 'Diagnostic complet · session active',
    );
    await expect(page.locator('#leadT')).toHaveText(
      lang === 'en'
        ? 'The analysis is finished. Your full report, with the priorities and the action plan, is waiting.'
        : 'L’analyse est terminée. Votre rapport complet, avec les priorités et le plan d’action, vous attend.',
    );
  });

  test(`compte connecté, site non vérifié : pas de « diagnostic complet » (${lang})`, async ({
    page,
  }) => {
    await signedInAudit(page, false);
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=light');
      await toEnglish(page);
    }
    await page.goto(`/progression?id=${AUDIT_ID}&theme=light`);
    await expect(page.locator('body')).toHaveClass(/\bdone\b/, {
      timeout: 15_000,
    });
    await expect(page.locator('.eyebrow.intro')).toHaveText(
      lang === 'en'
        ? 'Partial diagnosis · site not verified'
        : 'Diagnostic partiel · site non vérifié',
    );
    await expect(page.locator('#leadT')).toHaveText(
      lang === 'en'
        ? 'The analysis is finished. Your report and its action plan are waiting; verify the site to open Security, Privacy and DNS / email.'
        : 'L’analyse est terminée. Votre rapport et son plan d’action vous attendent ; vérifiez le site pour ouvrir Sécurité, Vie privée et DNS / e-mail.',
    );
    await expect(
      page.getByText(
        /full diagnosis|diagnostic complet|rapport complet|full report/i,
      ),
    ).toHaveCount(0);
  });
}
