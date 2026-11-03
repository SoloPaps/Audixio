import { expect, test } from '@playwright/test';

const WALLS = [
  {
    path: '/compte',
    next: '%2Fcompte',
    title: 'Votre compte',
  },
  {
    path: '/historique',
    next: '%2Fhistorique',
    title: 'Connectez-vous pour voir vos sites.',
  },
  {
    path: '/verifier',
    next: '%2Fverifier',
    title: 'Prouver que le site est à vous',
  },
  {
    path: '/brief?id=00000000-0000-4000-8000-000000000099',
    next: '%2Fbrief%3Fid%3D00000000-0000-4000-8000-000000000099',
    title: 'Connectez-vous ou inscrivez-vous',
  },
  {
    path: '/sites',
    next: '%2Fsites',
    title: 'Vos sites',
  },
  {
    path: '/compte/alertes',
    next: '%2Fcompte%2Falertes',
    title: 'Réglages des alertes',
  },
];

test.describe('mur hors session', () => {
  for (const wall of WALLS) {
    test(`${wall.path} reprend la barre, le pied et une carte`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(wall.path);
      const card = page.locator('.session-wall');
      await expect(card).toBeVisible();
      await expect(card.getByRole('heading', { level: 1 })).toHaveText(
        wall.title,
      );
      await expect(card).toHaveCSS('border-top-left-radius', '28px');
      await expect(card).toHaveCSS('padding-top', '48px');
      const login = card.getByRole('link', { name: 'Connexion' });
      await expect(login).toHaveAttribute(
        'href',
        `/connexion?next=${wall.next}`,
      );
      await expect(login).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(login).toHaveCSS('background-color', 'rgb(61, 82, 160)');
      await expect(
        card.getByRole('link', { name: 'Inscription' }),
      ).toHaveAttribute('href', `/inscription?next=${wall.next}`);

      const nav = page.getByRole('navigation', {
        name: 'Navigation principale',
      });
      const home = nav.getByRole('link', { name: 'Accueil' });
      await expect(home).toHaveCSS('padding-top', '9px');
      await expect(home).toHaveCSS('padding-left', '16px');
      await expect(home).toHaveCSS('border-top-left-radius', '999px');
      await expect(page.locator('.axn-bar .axn-cta')).toHaveCSS(
        'color',
        'rgb(255, 255, 255)',
      );
      await expect(page.locator('.axn-bar .axn-cta')).toHaveText('Connexion');

      const foot = page.locator('.axf-in');
      const box = await foot.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      expect(box.x).toBeGreaterThan(16);
      expect(Math.abs(1280 - box.width - box.x * 2)).toBeLessThan(4);
      await expect(foot).not.toHaveCSS('padding-left', '0px');

      await page.setViewportSize({ width: 330, height: 700 });
      await expect(
        page.getByRole('button', { name: 'Ouvrir le menu' }),
      ).toBeVisible();
      const narrow = await foot.boundingBox();
      expect(narrow).not.toBeNull();
      if (!narrow) return;
      expect(narrow.x).toBeGreaterThan(8);
      expect(Math.abs(330 - narrow.width - narrow.x * 2)).toBeLessThan(4);
    });
  }
});
