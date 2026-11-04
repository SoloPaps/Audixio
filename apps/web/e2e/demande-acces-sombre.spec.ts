import { expect, test } from '@playwright/test';

/** Bugs #46/#69 : la consigne sous « Envoyer la demande par e-mail » reste lisible en sombre. */

test('consigne propriétaire lisible en thème sombre (#46/#69)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/demande-acces?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const note = page.locator('.owner-note');
  await note.scrollIntoViewIfNeeded();
  const ratios = await page.evaluate(() => {
    type El = { parentElement: El | null };
    const view = globalThis as unknown as {
      document: { querySelector: (s: string) => El | null };
      getComputedStyle: (n: El) => { color: string; backgroundColor: string };
    };
    const rgb = (text: string): number[] =>
      (text.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]): number => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    const ratio = (selector: string): number => {
      const node = view.document.querySelector(selector);
      if (!node) return 0;
      let cur: El | null = node;
      let back = [0, 0, 0];
      while (cur) {
        const c = rgb(view.getComputedStyle(cur).backgroundColor);
        if (c.length >= 3 && (c[3] ?? 1) > 0.5) {
          back = c;
          break;
        }
        cur = cur.parentElement;
      }
      const a = lum(rgb(view.getComputedStyle(node).color));
      const b = lum(back);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    return [ratio('.owner-note'), ratio('.owner-note a')];
  });
  for (const value of ratios) expect(value).toBeGreaterThanOrEqual(4.5);
});
