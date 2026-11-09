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

test('C10 : accueil EN, titre, jauge et lecture passive en anglais', async ({
  page,
}) => {
  await page.goto('/?theme=light');
  await toEnglish(page);
  await expect(page).toHaveTitle(
    'Check your site’s health, for free — Audixio',
  );
  await expect(page.locator('.score-slot [role="img"]')).toHaveAttribute(
    'aria-label',
    'Overall score: 66 out of 100, grade C, needs work',
  );
  const seen = new Set<string>();
  const sub = page.locator('#win-sub');
  await page.locator('#window').scrollIntoViewIfNeeded();
  for (let i = 0; i < 40; i++) {
    seen.add((await sub.textContent()) ?? '');
    await page.waitForTimeout(100);
  }
  const passive = [...seen].filter((line) => line.startsWith('Passive read'));
  expect(passive.length).toBeGreaterThan(0);
  for (const line of passive) expect(line).not.toMatch(/[éèàç]|Qualité/);
});
