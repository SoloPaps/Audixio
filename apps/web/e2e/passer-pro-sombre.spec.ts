import { expect, test } from '@playwright/test';

/** Bug #105 : le quota « 2 / 2 » reste lisible dans la fenêtre Pro sombre. */

test('quota lisible dans la fenêtre Pro en thème sombre (#105)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/passer-pro?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const value = page.locator('#pm-mv');
  if (!(await page.locator('#pro-modal .pm-dlg').isVisible())) {
    await page.locator('[data-pro]').first().click({ force: true });
  }
  await expect(value).not.toBeEmpty();
  const ratio = await page.evaluate(() => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
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
    const node = view.document.querySelector('#pm-mv');
    if (!node) return 0;
    let cur: El | null = node;
    let back = [255, 255, 255];
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
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
