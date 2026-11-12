import { expect, test } from '@playwright/test';

type Painted = {
  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

test('FR/EN traduit la page et le bouton de compte reste lisible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(
    page.locator('.axn-tools').getByRole('link', { name: 'Connexion' }),
  ).toBeVisible();
  const cta = page.locator('.axn-tools .axn-cta');
  const colors = await cta.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (elt: typeof node) => {
        color: string;
        backgroundColor: string;
        webkitTextFillColor: string;
      };
    };
    const style = view.getComputedStyle(node);
    return {
      color: style.color,
      fill: style.webkitTextFillColor,
      background: style.backgroundColor,
    };
  });
  expect(colors.color).toBe('rgb(255, 255, 255)');
  expect(colors.fill).toBe('rgb(255, 255, 255)');
  expect(colors.background).not.toBe(colors.color);

  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.locator('.axn-links').getByRole('link', { name: 'How it works' }),
  ).toBeVisible();
  await expect(
    page.locator('.axn-tools').getByRole('link', { name: 'FR — Français' }),
  ).toBeVisible();
});

test('le thème bascule au clic et suit l’appareil', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const paper = await page.evaluate(() => {
    const view = globalThis as unknown as {
      getComputedStyle: (node: Painted) => { backgroundColor: string };
      document: { documentElement: Painted };
    };
    return view.getComputedStyle(view.document.documentElement).backgroundColor;
  });
  expect(paper).toBe('rgb(6, 9, 13)');
  const button = page
    .locator('.axn-tools')
    .getByRole('button', { name: 'Thème' });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('aucune ligne de repère au survol mobile', async ({ page }) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/');
  const chip = page.locator('main .chip, main .btn, main .badge').first();
  await chip.hover();
  const guide = await page.evaluate(() => {
    const view = globalThis as unknown as {
      document: {
        querySelectorAll: (selector: string) => Iterable<Painted>;
      };
      getComputedStyle: (node: Painted) => {
        outlineStyle: string;
        outlineWidth: string;
        backgroundImage: string;
        display: string;
      };
    };
    const grids = [...view.document.querySelectorAll('.bg-grid, .scan')];
    if (grids.some((node) => view.getComputedStyle(node).display !== 'none')) {
      return 'grille';
    }
    for (const node of view.document.querySelectorAll(
      'main button, main a, main .chip, main .badge',
    )) {
      const style = view.getComputedStyle(node);
      const width = Number.parseFloat(style.outlineWidth);
      if (style.outlineStyle !== 'none' && width > 0) return 'contour';
    }
    return '';
  });
  expect(guide).toBe('');
});

test('une adresse invalide reste sur l’accueil', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Adresse du site').fill('not a url');
  await page.getByRole('button', { name: 'Scanner mon site, gratuit' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#audit-form').getByRole('alert')).toContainText(
    'Indiquez une adresse complète',
  );
});

test('les pages retirées répondent 404', async ({ page }) => {
  for (const path of ['/lancer', '/search-console', '/compte/retour']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test('Vos droits ouvre le chapitre des droits', async ({ page }) => {
  await page.goto('/confidentialite');
  const link = page.locator('.toc').getByRole('link', { name: /Vos droits/ });
  await expect(link).toHaveAttribute('href', '#droits');
  const target = page.locator('#droits');
  await expect(target).toHaveAttribute('aria-labelledby', 'droits-t');
  await expect(target.locator('#droits-t')).toBeVisible();
  await expect(target.locator('#cookies-t')).toHaveCount(0);
});

test('la méthode n’a pas de point en trop', async ({ page }) => {
  await page.goto('/methode');
  await expect(page.getByText('Méthode 2026.1', { exact: true })).toBeVisible();
  await expect(page.getByText('Méthode 2026.1.')).toHaveCount(0);
});

test('la note du scan ne chevauche pas le texte', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const total = page.locator('#top [data-tot]');
    await expect(total).toBeVisible();
    await expect(total.locator('[data-ringl]')).toHaveText('C');
    const boxes = await page.evaluate(() => {
      const view = globalThis as unknown as {
        document: {
          querySelector: (selector: string) => Painted | null;
          querySelectorAll: (selector: string) => Iterable<Painted>;
        };
      };
      const box = (node: Painted) => node.getBoundingClientRect();
      const hit = (a: Painted, b: Painted) => {
        const one = box(a);
        const two = box(b);
        return (
          one.left < two.right &&
          one.right > two.left &&
          one.top < two.bottom &&
          one.bottom > two.top
        );
      };
      const total = view.document.querySelector('#top [data-tot]');
      const title = view.document.querySelector('#top h1');
      const lines = [...view.document.querySelectorAll('#top .journal li')];
      if (!total || !title || lines.length === 0) return null;
      return {
        title: hit(total, title),
        lines: lines.some((line) => hit(total, line)),
      };
    });
    expect(boxes, `${width}`).not.toBeNull();
    expect(boxes?.title, `${width} titre`).toBe(false);
    expect(boxes?.lines, `${width} journal`).toBe(false);
  }
});

test('le compte mobile affiche Connexion', async ({ page }) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  const account = page.locator('.axn-sheet .axn-acct');
  await expect(account).toBeVisible();
  await expect(account).toContainText('Connexion');
  await expect(account).toHaveAttribute('href', '/connexion');
  const cta = page.locator('.axn-sheet .axn-cta');
  await expect(cta).toBeVisible();
  await expect(cta).toContainText('Scanner mon site');
  const color = await cta.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (elt: typeof node) => { color: string };
    };
    return view.getComputedStyle(node).color;
  });
  expect(color).toBe('rgb(255, 255, 255)');
});
