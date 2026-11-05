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

test('M15 : /courriel (404) EN se traduit sans attendre un dictionnaire lent', async ({
  page,
}) => {
  await page.goto('/courriel?theme=light');
  await expect(page.locator('main h1')).toContainText('évaporée');
  const link = page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' });
  await link.waitFor();
  await page.waitForLoadState('networkidle');
  // Après le choix EN, la page rechargée ne doit plus attendre le réseau (tunnel lent de Mo).
  let slow = false;
  await page.route(
    (url) => url.pathname === '/dictionnaire-fr.json',
    async (route) => {
      if (slow) await new Promise((done) => setTimeout(done, 8000));
      await route.continue().catch(() => undefined);
    },
  );
  const reloaded = page.waitForEvent('framenavigated');
  page.on('framenavigated', () => {
    slow = true;
  });
  await link.click();
  await reloaded;
  const main = page.locator('main');
  await expect(main.locator('h1')).toContainText('evaporated', {
    timeout: 4000,
  });
  await expect(main).toContainText('Quick access', { timeout: 1000 });
  await expect(page.locator('footer')).toContainText('Legal notice', {
    timeout: 1000,
  });
  await expect(main).not.toContainText('Accès rapide');
  await expect(page.locator('footer')).not.toContainText('Mentions légales');
  // Textes posés par le script de la page : taille du fichier et courriel prérempli.
  await expect(page.locator('#fsize')).toHaveText(/ KB$|bytes$/);
  await expect(page.locator('#mailLink')).toHaveAttribute(
    'href',
    /subject=Broken%20link.*reporting%20a%20broken%20link/,
  );
});
