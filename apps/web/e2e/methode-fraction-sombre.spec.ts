import { expect, type Page, test } from '@playwright/test';

// Retour owner du 11 nov. : la formule du score global était illisible en
// sombre. /methode v6 écrit les formules en ligne (÷), dans un encart
// radiographie en sombre : le texte doit s’y lire, en clair comme en sombre.

type View = { getComputedStyle: (node: unknown) => Record<string, string> };

async function colors(page: Page): Promise<{ ink: string; bg: string }> {
  const formula = page.locator('#method-repro .formula').nth(1);
  await formula.scrollIntoViewIfNeeded();
  return formula.evaluate((node) => {
    const style = (globalThis as unknown as View).getComputedStyle(node);
    return { ink: style.color ?? '', bg: style.backgroundColor ?? '' };
  });
}

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).map(Number).map((v) => {
    const c = (v ?? 0) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

test('/methode sombre : la formule du score global se lit sur son encart', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/methode?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const { ink, bg } = await colors(page);
  // Jetons --d-vmxink et --d-vmxbg du thème sombre unique.
  expect(ink).toBe('rgb(181, 218, 255)');
  expect(bg).toBe('rgb(8, 20, 32)');
  expect(ratio(ink, bg)).toBeGreaterThan(7);
});

test('/methode clair : la formule reste sur une surface claire', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/methode?theme=light');
  const { ink, bg } = await colors(page);
  expect(luminance(bg)).toBeGreaterThan(0.8);
  expect(ratio(ink, bg)).toBeGreaterThan(7);
});
