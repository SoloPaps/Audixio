import { expect, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

// Le typecheck e2e n'embarque pas lib.dom : vue minimale des globals du navigateur.
type Style = {
  color: string;
  backgroundColor: string;
  backgroundImage: string;
  borderTopStyle: string;
  boxShadow: string;
  outlineStyle: string;
};
type Dom = {
  getComputedStyle: (node: unknown, pseudo?: string) => Style;
  document: {
    documentElement: { dataset: Record<string, string | undefined> };
  };
};

function lum(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05);
}

// #59 : le bouton « fait » de la checklist reste lisible en sombre, cliqué puis survolé.
test('#59 bouton de checklist lisible en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubSession(page);
  await page.goto('/bienvenue?theme=dark');
  const mark = page.locator('#e1 button.mark');
  await expect(mark).toBeVisible();
  await page.waitForFunction(
    '[...document.querySelectorAll("astro-island")].every((node) => !node.hasAttribute("ssr"))',
  );
  await expect(page.locator('#rc')).toHaveText('0/3');
  // Sous charge, le premier clic peut précéder l'écouteur : on reclique tant que l'état ne bascule pas.
  await expect(async () => {
    if ((await mark.getAttribute('aria-pressed')) !== 'true')
      await mark.click();
    await expect(mark).toHaveAttribute('aria-pressed', 'true', {
      timeout: 1000,
    });
  }).toPass();
  await mark.hover();
  await page.waitForTimeout(400);
  const c = await mark.evaluate((node) => {
    const s = (globalThis as unknown as Dom).getComputedStyle(node);
    return { fg: s.color, bg: s.backgroundColor, img: s.backgroundImage };
  });
  expect(c.img).toBe('none');
  expect(c.bg).not.toMatch(/rgba\(\d+, \d+, \d+, 0\)/);
  expect(ratio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
});

// #110 : la barre collante de /ecoconception reste opaque en sombre.
test('#110 barre collante opaque en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/ecoconception?theme=dark');
  const bar = page.locator('form .bar');
  await expect(bar).toBeVisible();
  const bg = await bar.evaluate(
    (node) =>
      (globalThis as unknown as Dom).getComputedStyle(node).backgroundColor,
  );
  const alpha = Number((bg.match(/rgba\([^)]*,\s*([\d.]+)\)/) ?? ['', '1'])[1]);
  expect(alpha).toBeGreaterThanOrEqual(0.95);
  expect(lum(bg)).toBeLessThan(0.1);
});
