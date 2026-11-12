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
    path: '/brief',
    next: '%2Fbrief',
    title: 'Connectez-vous ou inscrivez-vous',
  },
  {
    path: '/bienvenue',
    next: '%2Fbienvenue',
    title: 'Bienvenue',
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
      // Pages v6 : bouton sur les jetons --cta / --cta-fg ; v2 : bleu #3d52a0.
      const v6 = (await page.locator('html[data-v6]').count()) > 0;
      if (v6) {
        const tok = await page.evaluate<{ cta: string; fg: string }>(`(() => {
          const t = document.createElement('i');
          t.style.background = 'var(--cta)';
          t.style.color = 'var(--cta-fg)';
          document.body.appendChild(t);
          const s = getComputedStyle(t);
          const r = { cta: s.backgroundColor, fg: s.color };
          t.remove();
          return r;
        })()`);
        await expect(login).toHaveCSS('color', tok.fg);
        await expect(login).toHaveCSS('background-color', tok.cta);
      } else {
        await expect(login).toHaveCSS('color', 'rgb(255, 255, 255)');
        await expect(login).toHaveCSS('background-color', 'rgb(61, 82, 160)');
      }
      await expect(
        card.getByRole('link', { name: 'Inscription' }),
      ).toHaveAttribute('href', `/inscription?next=${wall.next}`);

      const nav = page.getByRole('navigation', {
        name: 'Navigation principale',
      });
      const home = nav.getByRole('link', { name: 'Comment ça marche' });
      await expect(home).toHaveCSS('padding-top', '9px');
      await expect(home).toHaveCSS('padding-left', '16px');
      await expect(home).toHaveCSS('border-top-left-radius', '999px');
      await expect(page.locator('.axn-bar .axn-cta')).toHaveCSS(
        'color',
        'rgb(255, 255, 255)',
      );
      await expect(page.locator('.axn-bar .axn-cta')).toHaveText(
        /Scanner mon site/,
      );
      await expect(page.locator('.axn-bar .axn-acct')).toHaveText('Connexion');

      const foot = page.locator(
        v6 ? 'footer[data-dock-hide] .cols' : '.axf-in',
      );
      const box = await foot.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      // Pied v6 : colonnes à 16 px du bord, comme sur les autres pages v6.
      expect(box.x).toBeGreaterThan(v6 ? 15 : 16);
      expect(Math.abs(1280 - box.width - box.x * 2)).toBeLessThan(4);
      // v2 : marge intérieure du pied ; v6 : la position (> 15 px) suffit.
      if (!v6) await expect(foot).not.toHaveCSS('padding-left', '0px');

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

test('/badge sans id exige la connexion', async ({ page }) => {
  await page.goto('/badge');
  const card = page.locator('.session-wall');
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(
    'Connectez-vous ou inscrivez-vous',
  );
  await expect(card.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
    'href',
    '/connexion?next=%2Fbadge',
  );
  await expect(page.getByText('Ce rapport est introuvable')).toHaveCount(0);
});
