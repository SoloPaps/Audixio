import { expect, type Page, test } from '@playwright/test';

// Retour owner du 11 nov. : la barre de fraction de la formule du score
// global était invisible en sombre (trait --d-ln sur la carte foncée).

type View = { getComputedStyle: (node: unknown) => Record<string, string> };

async function bar(page: Page): Promise<string> {
  const top = page.locator('.formula .frac > span').first();
  await top.scrollIntoViewIfNeeded();
  return top.evaluate(
    (node) =>
      (globalThis as unknown as View).getComputedStyle(node)
        .borderBottomColor ?? '',
  );
}

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).map(Number).map((v) => {
    const c = (v ?? 0) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

test('/methode sombre : la barre de fraction se voit sur la carte', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/methode?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const color = await bar(page);
  // Jeton --d-mu du thème sombre unique, pas le trait --d-ln (#38467c).
  expect(color).toBe('rgb(182, 191, 220)');
  // Contraste avec la carte la plus claire du dégradé (--d-inv, #26306a).
  const card = luminance('rgb(38, 48, 106)');
  const ratio = (luminance(color) + 0.05) / (card + 0.05);
  expect(ratio).toBeGreaterThan(3);
});

test('/methode clair : la barre de fraction ne change pas', async ({
  page,
}) => {
  await page.goto('/methode?theme=light');
  expect(await bar(page)).toBe('rgba(255, 255, 255, 0.6)');
});
