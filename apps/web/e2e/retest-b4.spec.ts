import { expect, test } from '@playwright/test';

// B4 (retest nuit) : les pages « sans id » et l’impression visiteur
// affichent une carte centrée avec un h1 explicite, comme les autres murs.
const pages = [
  '/badge',
  '/brief',
  '/rapport/imprimer?id=00000000-0000-4000-8000-000000000000',
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const path of pages) {
    test(`B4 ${path} (${theme}) : carte stylée et h1 non vide`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((value) => {
        localStorage.setItem('audigy-theme', value);
      }, theme);
      await page.goto(path);
      const card = page.locator('.session-wall');
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card.locator('h1')).not.toHaveText('');
      await expect(page.locator('main#contenu')).toHaveCount(1);
      const box = await card.evaluate((node) => {
        const view = globalThis as unknown as {
          getComputedStyle: (n: unknown) => {
            backgroundColor: string;
            borderTopLeftRadius: string;
          };
          innerWidth: number;
        };
        const style = view.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          bg: style.backgroundColor,
          radius: Number.parseFloat(style.borderTopLeftRadius),
          left: rect.left,
          right: view.innerWidth - rect.right,
        };
      });
      expect(box.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(box.radius).toBeGreaterThan(0);
      expect(Math.abs(box.left - box.right)).toBeLessThan(40);
    });
  }
}
