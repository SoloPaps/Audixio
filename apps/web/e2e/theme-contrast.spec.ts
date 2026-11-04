import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PAGES = [
  '/',
  '/methode',
  '/sites',
  '/exemple-rapport',
  '/rapport',
  '/demande-acces',
  '/pro',
  '/confidentialite',
  '/cgu',
  '/ecoconception',
  '/connexion',
  '/inscription',
  '/mentions-legales',
  '/accessibilite',
  '/cookies',
  '/robot',
  '/audit-echoue',
  '/progression',
  '/compte',
  '/bienvenue',
  '/verifier',
] as const;

async function contrast(page: Page, path: string, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto(`${path}?theme=${theme}`);
  await page.locator('main, #contenu').first().waitFor({ timeout: 15_000 });
  const heading = page.getByRole('heading').first();
  if (await heading.count()) {
    await heading.waitFor({ timeout: 15_000 }).catch(() => undefined);
  }
  const bar = page.locator('header.axn');
  if ((await bar.count()) > 0 && (await bar.first().isVisible())) {
    await expect(page.locator('.axn-logo img.axn-logo-d')).toBeVisible();
  }
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  expect(
    results.violations,
    `${theme} ${path}\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  for (const path of PAGES) {
    test(`contraste ${theme} ${path}`, async ({ page }) => {
      await contrast(page, path, theme);
    });
  }
}
