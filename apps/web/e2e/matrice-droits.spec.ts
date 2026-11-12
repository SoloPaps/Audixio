import { expect, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

const PUBLIC_PAGES = [
  '/',
  '/methode',
  '/pro',
  '/cgu',
  '/confidentialite',
  '/mentions-legales',
  '/accessibilite',
  '/cookies',
  '/exemple-rapport',
  '/robot',
];

const WALLED = [
  { path: '/compte', fr: 'Votre compte', en: 'Your account' },
  { path: '/sites', fr: 'Vos sites', en: 'Your sites' },
  {
    path: '/historique',
    fr: 'Connectez-vous pour voir vos sites.',
    en: 'Sign in to see your sites.',
  },
  {
    // Page d’un site (lot 4) ; /compte/alertes est devenue /compte#alertes (R15).
    path: '/sites/exemple.fr',
    fr: 'Connectez-vous pour ouvrir ce site.',
    en: 'Sign in to open this site.',
  },
  { path: '/bienvenue', fr: 'Bienvenue', en: 'Welcome' },
];

test.describe('matrice des droits — visiteur', () => {
  test('les pages publiques n’affichent pas le mur de connexion', async ({
    page,
  }) => {
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.locator('.session-wall'), path).toHaveCount(0);
    }
  });

  for (const wall of WALLED) {
    test(`${wall.path} : mur de connexion en français et en anglais`, async ({
      page,
    }) => {
      await page.goto(wall.path);
      const card = page.locator('.session-wall');
      await expect(card).toBeVisible();
      await expect(card.getByRole('heading', { level: 1 })).toHaveText(wall.fr);
      await expect(card.getByRole('link', { name: 'Connexion' })).toBeVisible();

      await toEnglish(page);
      await expect(page.locator('.session-wall')).toBeVisible();
      await expect(
        page.locator('.session-wall').getByRole('heading', { level: 1 }),
      ).toHaveText(wall.en);
      await expect(
        page.locator('.session-wall').getByRole('link', { name: 'Sign in' }),
      ).toBeVisible();
    });
  }

  test('/passer-pro redirige le visiteur vers /pro', async ({ page }) => {
    await page.goto('/passer-pro?from=test#pro-sites');
    await expect(page).toHaveURL(/\/pro\?from=test#pro-sites/);
    await expect(page.locator('#waitlist-form')).toBeVisible();
    await expect(page.locator('#deja-pro')).toBeHidden();
  });

  test('/historique visiteur : pas de menu d’export', async ({ page }) => {
    await page.goto('/historique');
    await expect(page.locator('.session-wall')).toBeVisible();
    await expect(page.locator('#hexpb, #hexpm, [data-hfmt]')).toHaveCount(0);
  });
});
