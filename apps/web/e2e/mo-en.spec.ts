import { expect, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

// QA Mo 05/11 : plus de français quand l’anglais est actif.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('M14 : /bienvenue EN, visiteur : titre « Welcome »', async ({ page }) => {
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main h1')).toHaveText('Welcome');
  await expect(page.locator('main')).not.toContainText('Bienvenue');
});

test('M14 : /bienvenue EN, connecté : fil, titre et étapes en anglais', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  const main = page.locator('main');
  await expect(main.locator('h1')).toContainText('Welcome to Audixio');
  await expect(main.locator('.crumbs')).toContainText('Home');
  await expect(main.locator('.crumbs')).toContainText('Welcome');
  await expect(main.locator('.bv-trk')).toContainText('1. Audit');
  await expect(main.locator('.bv-trk')).toContainText('3. Track');
  await expect(main).toContainText('Run my first audit');
  for (const french of [
    'Bienvenue',
    'Auditer',
    'Suivre',
    'Accueil',
    'Lancer',
    'Voir mes sites',
    'Marquer comme faite',
  ]) {
    await expect(main).not.toContainText(french);
  }
});
