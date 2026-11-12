import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Thème sombre, palette enrichie (owner, 6 nov.) : cartes un cran plus
 * claires que le fond, bordure fine claire, plus seulement du bleu marine.
 * Couleurs seulement ; le clair ne bouge pas.
 */

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

const CARD = 'rgb(27, 35, 71)';
const LINE = 'rgb(56, 70, 124)';
const RAISED = 'rgb(46, 58, 104)';

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

test('sombre : méthode, exemple et demande d’accès suivent le modèle de carte', async ({
  page,
}) => {
  await open(page, '/methode?theme=dark');
  const lk = page.locator('a.lk').first();
  expect(await css(lk, 'backgroundColor')).toBe(CARD);
  expect(await css(lk, 'borderTopColor')).toBe(LINE);

  await open(page, '/exemple-rapport?theme=dark');
  expect(await css(page.locator('.cst .seg').first(), 'backgroundColor')).toBe(
    RAISED,
  );
  expect(await css(page.locator('.fin2-viz'), 'backgroundColor')).toBe(CARD);
  expect(await css(page.locator('.fin2'), 'borderTopColor')).toBe(LINE);

  await open(page, '/demande-acces?theme=dark');
  expect(await css(page.locator('.request-card'), 'borderTopColor')).toBe(LINE);
  expect(await css(page.locator('.report-preview'), 'borderTopColor')).toBe(
    LINE,
  );
});
