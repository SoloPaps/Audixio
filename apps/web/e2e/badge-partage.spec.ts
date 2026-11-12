import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';
import { escapeRe, ORIGIN } from './origin.js';

// QA Mo 05/11, thème badge-partage : M3, B1, B2, B4.

const GUEST_ID = '1dfeaad0-f09c-4405-a5eb-eed8fe1235b1';

function guestPayload(): unknown {
  return {
    audit: {
      id: GUEST_ID,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 74,
      siteVerified: false,
      coverage: 0.6,
      createdAt: '2026-11-05T10:00:00.000Z',
      startedAt: '2026-11-05T10:00:01.000Z',
      finishedAt: '2026-11-05T10:03:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 70, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 80, coverage: 1, level: 'good' },
    ],
    findings: [],
  };
}

async function asGuest(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    sessionStorage.setItem('audixio-guest-audit', JSON.stringify(value));
  }, guestPayload());
}

test('M3 (bug_5db3cab6, bug_6de9c2d4) : badge visiteur sans lien public ni lien vers /rapport privé', async ({
  page,
}) => {
  await asGuest(page);
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=light`);
  const code = page.locator('#code');
  await expect(code).toHaveValue(/<a href=/, { timeout: 15_000 });
  for (const style of [/^Complet/, /^Compact/, /^Pastille/]) {
    await page.getByRole('radio', { name: style }).check();
    const value = await code.inputValue();
    expect(value).not.toContain('/rapport');
    expect(value).not.toContain(GUEST_ID);
    expect(value).toContain(`href="${ORIGIN}/"`);
  }
  // Pas de champ « Lien public » vide ni de bouton « Copier le lien » inerte.
  await expect(page.locator('#lnk')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Copier le lien' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Voir la page publique' }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      'Créez un compte gratuit pour partager ce rapport par lien.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Créer un compte' }),
  ).toHaveAttribute('href', /\/inscription/);
  await expect(page.locator('.foot p')).toHaveText(
    'Sans compte, le badge renvoie vers l’accueil d’Audixio : votre rapport reste privé.',
  );
});

test('B1 (bug_ce249d1e) : un compte Pro ne lit pas le plafond du compte gratuit', async ({
  page,
}) => {
  await stubSession(page, 'pro');
  await page.goto('/compte?theme=light#acces-partages');
  const note = page.locator('#acces-partages .ap-note');
  await expect(note).toHaveText(
    'Compte Pro : liens actifs sans limite (public ou équipe). Le lien équipe reste en lecture seule, même sans compte pour le destinataire.',
    { timeout: 15_000 },
  );
  await expect(note).not.toContainText('Compte gratuit');
});

test('B1 : le compte gratuit garde son plafond d’un lien', async ({ page }) => {
  await stubSession(page, 'free');
  await page.goto('/compte?theme=light#acces-partages');
  await expect(page.locator('#acces-partages .ap-note')).toHaveText(
    'Compte gratuit : 1 lien actif à la fois (public ou équipe). Le lien équipe reste en lecture seule, même sans compte pour le destinataire.',
    { timeout: 15_000 },
  );
});

async function openShare(page: Page, access: 'public' | 'team'): Promise<void> {
  await page.route('**/api/partage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access,
        label: 'bon.audigy.test',
        url: 'https://bon.audigy.test',
        finishedAt: '2026-11-05T10:03:00.000Z',
        methodVersion: '2026.1',
        auditId: null,
        noteGlobale: 81,
        domaines: [{ domain: 'performance', score: 81 }],
      }),
    });
  });
  await page.goto(`/partage/${'c4'.repeat(16)}/?theme=light`);
}

test('B2 (bug_7d4e4d31) : un lien public ne s’annonce pas « Lien équipe »', async ({
  page,
}) => {
  await openShare(page, 'public');
  const banner = page.locator('.share-banner');
  await expect(banner).toHaveText('Lien public · Lecture seule', {
    timeout: 15_000,
  });
  await expect(page.getByText('Lien équipe')).toHaveCount(0);
});

test('B2 : un lien équipe garde « Lien équipe »', async ({ page }) => {
  await openShare(page, 'team');
  await expect(page.locator('.share-banner')).toHaveText(
    'Lien équipe · Lecture seule',
    { timeout: 15_000 },
  );
});

test('B4 (bug_cb501466, bug_f85727e1) : badge Complet lisible en sombre', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await asGuest(page);
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=dark`);
  const label = page.locator('.stage a span');
  await expect(label).toHaveText('Audité par Audixio', { timeout: 15_000 });
  // Contraste du libellé contre le fond blanc du badge (style en ligne).
  const ratio = await label.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (n: unknown) => {
        color: string;
        webkitTextFillColor: string;
        backgroundColor: string;
      };
    };
    const rgb = (s: string): number[] =>
      (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lin = (v: number): number => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r = 0, g = 0, b = 0]: number[]): number =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const own = view.getComputedStyle(node);
    const fill = own.webkitTextFillColor || own.color;
    const card = view.getComputedStyle(
      (node as { parentElement: unknown }).parentElement,
    ).backgroundColor;
    const [hi, lo] = [lum(rgb(fill)), lum(rgb(card))].sort((a, b) => b - a);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('B4 : badge Compact lisible en sombre sur le fond d’aperçu', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await asGuest(page);
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=dark`);
  await page.getByRole('radio', { name: /^Compact/ }).check();
  const label = page.locator('.stage a span');
  await expect(label).toHaveText('Audixio', { timeout: 15_000 });
  const colors = await label.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (n: unknown) => {
        color: string;
        backgroundColor: string;
      };
      document: { querySelector: (s: string) => unknown };
    };
    return {
      text: view.getComputedStyle(node).color,
      stage: view.getComputedStyle(view.document.querySelector('.stage'))
        .backgroundColor,
    };
  });
  expect(colors.text).toBe('rgb(30, 42, 85)');
  expect(colors.stage).toBe('rgb(255, 255, 255)');
});

test('badge connecté sans lien public : créer le lien d’abord, jamais de code vers /rapport (décision du 6 nov.)', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(guestPayload()),
    });
  });
  const posted: string[] = [];
  await page.route('**/api/liens', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    posted.push(route.request().postData() ?? '');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'l1', url: '/partage/jeton-public-1' }),
    });
  });
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=light`);
  await expect(
    page.getByText(
      'Créez d’abord le lien public du rapport pour obtenir le code du badge.',
    ),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#code')).toHaveCount(0);
  await expect(page.locator('.stage')).toHaveCount(0);
  await expect(
    page.locator(`.dlg a[href^="/rapport/"]:not(.x):not(.lk-pill)`),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Créer le lien public' }).click();
  const code = page.locator('#code');
  await expect(code).toHaveValue(
    new RegExp(`href="${escapeRe(ORIGIN)}/partage/jeton-public-1"`),
  );
  expect(posted).toHaveLength(1);
  expect(JSON.parse(posted[0] ?? '{}')).toEqual({
    auditId: GUEST_ID,
    kind: 'public',
  });
  for (const style of [/^Complet/, /^Compact/, /^Pastille/]) {
    await page.getByRole('radio', { name: style }).check();
    expect(await code.inputValue()).not.toContain('/rapport');
  }
  await expect(page.locator('#lnk')).toHaveValue(
    `${ORIGIN}/partage/jeton-public-1`,
  );
  await expect(
    page.getByRole('link', { name: 'Voir la page publique' }),
  ).toBeVisible();
});

test('badge connecté avec lien public : le code vise /partage', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(guestPayload()),
    });
  });
  await page.route(
    'http://127.0.0.1:54321/rest/v1/reports**',
    async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': ORIGIN,
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          {
            share_token: 'deja-public',
            visibility: 'public',
            revoked_at: null,
          },
        ]),
      });
    },
  );
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=light`);
  await expect(page.locator('#code')).toHaveValue(
    new RegExp(`href="${escapeRe(ORIGIN)}/partage/deja-public"`),
    { timeout: 15_000 },
  );
  await expect(page.getByText('Créez d’abord le lien public')).toHaveCount(0);
});

async function linkLimitReached(page: Page): Promise<void> {
  await stubSession(page, 'free');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(guestPayload()),
    });
  });
  await page.route('**/api/liens', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'user_limit',
        messageKey: 'api.error.user_limit',
      }),
    });
  });
}

test('badge connecté, plafond d’un lien du plan gratuit atteint : message dédié', async ({
  page,
}) => {
  await linkLimitReached(page);
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=light`);
  await page
    .getByRole('button', { name: 'Créer le lien public' })
    .click({ timeout: 15_000 });
  await expect(page.getByRole('alert')).toHaveText(
    'Le plan gratuit permet un seul lien actif. Révoquez le lien en cours ou passez au plan Pro.',
  );
  await expect(page.getByText('Le lien n’a pas pu être créé.')).toHaveCount(0);
  await expect(page.locator('#code')).toHaveCount(0);
});

test('badge connecté, plafond d’un lien atteint : message dédié en anglais', async ({
  page,
}) => {
  await linkLimitReached(page);
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await page.goto(`/rapport/${GUEST_ID}/badge?theme=light`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page
    .getByRole('button', { name: 'Create the public link' })
    .click({ timeout: 15_000 });
  await expect(page.getByRole('alert')).toHaveText(
    'The free plan allows one active link. Revoke the current link or upgrade to Pro.',
  );
});
