import { expect, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('C10 : le titre d’onglet passe en anglais et revient en français', async ({
  page,
}) => {
  await page.goto('/methode?theme=light');
  await expect(page).toHaveTitle(/^Méthode — Audi(?:xio|gy)$/);
  await toEnglish(page);
  await expect(page).toHaveTitle(/^Method — Audi(?:xio|gy)$/);
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'FR — Français' })
    .click();
  await expect(page).toHaveTitle(/^Méthode — Audi(?:xio|gy)$/);
});

test('C10 : accueil EN, titre, note et scan animé en anglais', async ({
  page,
}) => {
  await page.goto('/?theme=light');
  await toEnglish(page);
  await expect(page).toHaveTitle(
    'Check your site’s health, for free — Audixio',
  );
  await page.reload();
  const status = page.locator('#top [data-scanst]');
  const journal = page.locator('#top .journal');
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    seen.add((await status.textContent()) ?? '');
    seen.add((await journal.innerText()) ?? '');
    await page.waitForTimeout(100);
  }
  for (const line of seen) expect(line).not.toMatch(/[éèàç]|Analyse|Note /);
  await expect(status).toHaveText('Scan complete', { timeout: 15_000 });
  await expect(page.locator('#top [data-ringl]')).toHaveText('C');
});
