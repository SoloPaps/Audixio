import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Thème sombre, palette enrichie (owner, 6 nov.) : cartes un cran plus
 * claires que le fond, bordure fine claire, plus seulement du bleu marine.
 * Couleurs seulement ; le clair ne bouge pas.
 */

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

const CARD = 'rgb(28, 35, 64)';
const LINE = 'rgb(61, 77, 122)';

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

test('accueil sombre : cartes, étapes, constats et panneau Confiance', async ({
  page,
}) => {
  await open(page, '/?theme=dark');
  const card = page.locator('.lcards a').first();
  expect(await css(card, 'backgroundColor')).toBe(CARD);
  expect(await css(card, 'borderTopColor')).toBe(LINE);
  expect(
    await css(page.locator('.lcards .ic').first(), 'backgroundColor'),
  ).toBe('rgb(35, 44, 80)');
  // Étapes « En pratique » : ouvertes comme en clair, pas de bloc collé au texte.
  const step = page.locator('.steps .step').first();
  expect(await css(step, 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  expect(await css(step, 'backgroundImage')).toBe('none');
  // Panneau Confiance : un plan au-dessus du fond de page.
  const panel = page.locator('.section.dark').first();
  expect(await css(panel, 'backgroundColor')).toBe('rgb(23, 29, 56)');
  const body = await css(page.locator('body'), 'backgroundColor');
  expect(await css(panel, 'backgroundColor')).not.toBe(body);
  // Constats de l’aperçu : vert et ambre, pas de texte nu.
  expect(await css(page.locator('.find.ok'), 'backgroundColor')).toBe(
    'rgb(18, 50, 38)',
  );
  expect(await css(page.locator('.find.warn'), 'backgroundColor')).toBe(
    'rgb(58, 42, 16)',
  );
  // Plus d’un seul bleu : les libellés de section passent en lilas.
  expect(await css(page.locator('.s-head .eyebrow').first(), 'color')).toBe(
    'rgb(199, 184, 255)',
  );
});

test('accueil clair : inchangé (cartes en dégradé, domaines de l’exemple en liste)', async ({
  page,
}) => {
  await open(page, '/?theme=light');
  const row = page.locator('#legacy-rows li').first();
  await expect(row).toBeVisible();
  // Décision owner : pas de pastilles ajoutées en clair.
  expect(await css(row, 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  expect(await css(row, 'borderTopLeftRadius')).toBe('0px');
  expect(
    await css(page.locator('.lcards a').first(), 'backgroundImage'),
  ).toContain('linear-gradient');
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
    'rgb(35, 44, 80)',
  );
  expect(await css(page.locator('.fin2-viz'), 'backgroundColor')).toBe(CARD);
  expect(await css(page.locator('.fin2'), 'borderTopColor')).toBe(LINE);

  await open(page, '/demande-acces?theme=dark');
  expect(await css(page.locator('.request-card'), 'borderTopColor')).toBe(LINE);
  expect(await css(page.locator('.report-preview'), 'borderTopColor')).toBe(
    LINE,
  );
});
