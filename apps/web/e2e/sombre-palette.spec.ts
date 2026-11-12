import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Thème sombre, palette enrichie (owner, 6 nov.) : cartes un cran plus
 * claires que le fond, bordure fine claire, plus seulement du bleu marine.
 * Couleurs seulement ; le clair ne bouge pas.
 */

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

const LINE = 'rgb(56, 70, 124)';

async function css(locator: Locator, prop: string): Promise<string> {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate(
    (node, name) =>
      (globalThis as unknown as View).getComputedStyle(node)[name] ?? '',
    prop,
  );
}

async function open(page: Page, url: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    url.includes('theme=dark') ? 'dark' : 'light',
  );
}

// Accueil v6 : jetons v6 (tokens.css, et theme-dark.css pour le sombre).
test('accueil v6 sombre : fond, cartes un cran au-dessus, constats colorés', async ({
  page,
}) => {
  await open(page, '/?theme=dark');
  const paper = await css(page.locator('html'), 'backgroundColor');
  expect(paper).toBe('rgb(6, 9, 13)');
  const plan = page.locator('#tarifs .plan').first();
  expect(await css(plan, 'backgroundColor')).toBe('rgb(12, 18, 26)');
  expect(await css(plan, 'borderTopColor')).toBe('rgb(27, 38, 51)');
  expect(
    await css(page.locator('#faq details').first(), 'backgroundColor'),
  ).not.toBe(paper);
  expect(
    await css(page.locator('#couches .lyr li').first(), 'backgroundColor'),
  ).toBe('rgb(17, 25, 36)');
  // Constats du scan : rouge et vert éclaircis pour le fond sombre.
  expect(
    await css(
      page.locator('#top .journal li.bad .d').first(),
      'backgroundColor',
    ),
  ).toBe('rgb(255, 122, 107)');
  expect(
    await css(
      page.locator('#top .journal li.good .d').first(),
      'backgroundColor',
    ),
  ).toBe('rgb(94, 224, 176)');
});

test('accueil v6 clair : fond gris clair, cartes blanches, constats francs', async ({
  page,
}) => {
  await open(page, '/?theme=light');
  expect(await css(page.locator('html'), 'backgroundColor')).toBe(
    'rgb(243, 245, 248)',
  );
  expect(
    await css(page.locator('#tarifs .plan').first(), 'backgroundColor'),
  ).toBe('rgb(255, 255, 255)');
  expect(
    await css(
      page.locator('#top .journal li.bad .d').first(),
      'backgroundColor',
    ),
  ).toBe('rgb(194, 52, 31)');
  expect(
    await css(
      page.locator('#top .journal li.good .d').first(),
      'backgroundColor',
    ),
  ).toBe('rgb(15, 122, 85)');
});

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  return `rgb(${n(0)}, ${n(2)}, ${n(4)})`;
}

test('sombre : méthode, exemple et demande d’accès suivent le modèle de carte', async ({
  page,
}) => {
  // /methode v6 : cartes des domaines sur la surface v6 sombre, trait v6.
  await open(page, '/methode?theme=dark');
  const dom = page.locator('#domaines .dom').first();
  const tokens = await page.locator('html').evaluate((node) => {
    const style = (
      globalThis as unknown as {
        getComputedStyle: (el: unknown) => {
          getPropertyValue: (name: string) => string;
        };
      }
    ).getComputedStyle(node);
    return {
      surf: style.getPropertyValue('--d-vsf').trim(),
      surf2: style.getPropertyValue('--d-vsf2').trim(),
      line: style.getPropertyValue('--d-vln').trim(),
    };
  });
  expect(tokens.surf).not.toBe('');
  expect(await css(dom, 'backgroundColor')).toBe(hexToRgb(tokens.surf));
  expect(await css(dom, 'borderTopColor')).toBe(hexToRgb(tokens.line));

  // /exemple-rapport v6 : mêmes jetons v6 sombres (surface, surface 2, trait).
  await open(page, '/exemple-rapport?theme=dark');
  expect(await css(page.locator('.cst .seg').first(), 'backgroundColor')).toBe(
    hexToRgb(tokens.surf2),
  );
  expect(await css(page.locator('.fin2-viz'), 'backgroundColor')).toBe(
    hexToRgb(tokens.surf),
  );
  expect(await css(page.locator('.fin2'), 'borderTopColor')).toBe(
    hexToRgb(tokens.line),
  );

  await open(page, '/demande-acces?theme=dark');
  expect(await css(page.locator('.request-card'), 'borderTopColor')).toBe(LINE);
  expect(await css(page.locator('.report-preview'), 'borderTopColor')).toBe(
    LINE,
  );
});
