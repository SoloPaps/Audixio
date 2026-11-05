import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';
import { openHistory } from './h-history.js';

async function withFullName(page: Page, fullName: string): Promise<void> {
  // Session par cookie seulement : c’est elle qui porte le nom complet.
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        expires_in: 3600,
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'gratuit@exemple.fr',
          app_metadata: {},
          user_metadata: { full_name: fullName },
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    }),
  );
}

test('/bienvenue sans prénom : salut sans nom ni préfixe d’adresse', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  const title = page.locator('h1');
  await expect(title).toHaveText('Bienvenue sur Audixio');
  await expect(title).not.toContainText('gratuit');
  await expect(title).not.toContainText('Camille');
});

test('/bienvenue sans prénom en anglais : « Welcome to Audixio »', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await expect(page.locator('h1')).toHaveText('Welcome to Audixio');
});

test('/bienvenue avec prénom : le nom suit la virgule', async ({ page }) => {
  await withFullName(page, 'Léa');
  await page.goto('/bienvenue?theme=light');
  await expect(page.locator('h1')).toHaveText('Bienvenue sur Audixio, Léa');
});

test('/historique « Tout » : depuis le mois du premier audit, pas une date figée', async ({
  page,
}) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  await page.locator('.seg button').last().click();
  await expect(page.locator('#rng-note')).toHaveText(
    'Historique disponible depuis janvier 2026 : la courbe affiche déjà toute la période.',
  );
});

test('/historique « All » en anglais : « since January 2026 »', async ({
  page,
}) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await toEnglish(page);
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  await page.locator('.seg button').last().click();
  await expect(page.locator('#rng-note')).toHaveText(
    'History available since January 2026: the curve already shows the whole period.',
  );
});

test('/historique à 330 px : le graphique tient dans l’écran, sans défilement horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  const sizes = (await page.evaluate(`(() => {
    const svg = document.querySelector('text.val')?.closest('svg');
    const box = svg?.getBoundingClientRect();
    const label = svg?.querySelector('text');
    const font = label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0;
    const scale = box && svg ? box.width / (svg.viewBox.baseVal.width || box.width) : 0;
    return {
      scroll: document.documentElement.scrollWidth,
      right: box ? box.right : 9999,
      shown: font * scale,
    };
  })()`)) as { scroll: number; right: number; shown: number };
  expect(sizes.scroll).toBeLessThanOrEqual(330);
  expect(sizes.right).toBeLessThanOrEqual(330);
  expect(sizes.shown).toBeGreaterThanOrEqual(10);
});
