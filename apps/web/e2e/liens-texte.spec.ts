import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Liens de texte (owner, 6 nov.) : même dessin dans les deux thèmes —
 * trait fin décalé d’une teinte adoucie, plus épais au survol ; en sombre,
 * un bleu clair distinct du texte (avant : blanc comme le texte).
 */

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

async function style(link: Locator) {
  await link.scrollIntoViewIfNeeded();
  return link.evaluate((node) => {
    const css = (globalThis as unknown as View).getComputedStyle(node);
    return {
      color: css.color ?? '',
      line: css.textDecorationLine ?? '',
      thickness: css.textDecorationThickness ?? '',
      tint: css.textDecorationColor ?? '',
      offset: css.textUnderlineOffset ?? '',
    };
  });
}

async function open(page: Page, url: string, theme: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${url}?theme=${theme}`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

const PROSE: [string, string][] = [
  ['/confidentialite', 'bandeau cookies'],
  ['/demande-acces', 'voir ce que reçoit le propriétaire'],
  ['/methode', 'Voir les conditions d’utilisation.'],
];

for (const theme of ['light', 'dark'] as const) {
  for (const [url, name] of PROSE) {
    test(`lien de texte ${url} (${theme})`, async ({ page }) => {
      await open(page, url, theme);
      const link = page.getByRole('link', { name }).first();
      const rest = await style(link);
      expect(rest.line).toBe('underline');
      expect(rest.thickness).toBe('1px');
      expect(rest.offset).not.toBe('auto');
      expect(rest.tint).not.toBe(rest.color);
      if (theme === 'dark') expect(rest.color).toBe('rgb(169, 189, 246)');
      await link.hover();
      await expect.poll(async () => (await style(link)).thickness).toBe('2px');
    });
  }
}

test('inscription sombre : les liens CGU se distinguent du texte', async ({
  page,
}) => {
  await open(page, '/inscription', 'dark');
  const link = page.locator('a.lk').first();
  const text = await link.evaluate((node) => {
    const parent = (node as unknown as { parentElement: unknown })
      .parentElement;
    return (globalThis as unknown as View).getComputedStyle(parent).color ?? '';
  });
  const rest = await style(link);
  expect(rest.color).toBe('rgb(169, 189, 246)');
  expect(rest.color).not.toBe(text);
});
