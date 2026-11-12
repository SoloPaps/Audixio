import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './en-session.js';

// Plafond d’un lien actif du plan gratuit (POST 429 user_limit) : la feuille
// de partage du rapport et l’acceptation d’une demande d’accès le disent,
// au lieu d’un échec générique ou de « Connectez-vous pour répondre ».

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';
const LIMIT = {
  fr: 'Le plan gratuit permet un seul lien actif. Révoquez le lien en cours ou passez au plan Pro.',
  en: 'The free plan allows one active link. Revoke the current link or upgrade to Pro.',
};

function payload(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 72,
      siteVerified: true,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 70, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 75, coverage: 1, level: 'improve' },
    ],
    findings: [],
  };
}

// Anglais posé avant le chargement, comme brief-export.spec : pas de bascule
// par le menu, qui recharge la page pendant la navigation suivante.
async function english(page: Page): Promise<void> {
  const pack = await (await page.request.get('/dictionnaire-en.json')).text();
  await page.addInitScript((text) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem(k: string, v: string): void };
      }
    ).localStorage;
    storage.setItem('audigy-en', text);
    storage.setItem('audigy-locale', 'en');
  }, pack);
}

const limitBody = JSON.stringify({
  error: 'user_limit',
  messageKey: 'api.error.user_limit',
});

async function freeAccountAtLimit(page: Page): Promise<void> {
  await stubSession(page, 'free');
  await page.route('**/api/audits/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload()),
    }),
  );
  await page.route('**/api/liens**', (route) => {
    const write = route.request().method().toLowerCase() === 'post';
    return route.fulfill({
      status: write ? 429 : 200,
      contentType: 'application/json',
      body: write ? limitBody : JSON.stringify({ liens: [] }),
    });
  });
}

for (const lang of ['fr', 'en'] as const) {
  test(`feuille de partage du rapport : message du plafond d’un lien (${lang})`, async ({
    page,
  }) => {
    await freeAccountAtLimit(page);
    if (lang === 'en') await english(page);
    await page.goto(`/rapport/${AUDIT_ID}?theme=light`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page.locator('#shareBtn').click({ timeout: 15_000 });
    await page
      .locator('.sh-dlg')
      .getByRole('button', {
        name: lang === 'en' ? 'Create the link' : 'Créer le lien',
      })
      .click();
    await expect(page.locator('.sh-err')).toHaveText(LIMIT[lang]);
  });

  test(`demande d’accès acceptée au plafond : message du plafond, pas « connectez-vous » (${lang})`, async ({
    page,
  }) => {
    await stubSession(page, 'free');
    await page.route('**/api/liens/decision', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: limitBody,
      }),
    );
    if (lang === 'en') await english(page);
    await page.goto(
      `/sites/exemple.fr/demandes/req_948f2a1b7e?audit=${AUDIT_ID}&theme=light`,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page.locator('#ok').click();
    await expect(page.locator('#status')).toHaveText(LIMIT[lang]);
    await expect(page.locator('#status')).not.toContainText(
      lang === 'en' ? 'Sign in' : 'Connectez-vous',
    );
  });
}
