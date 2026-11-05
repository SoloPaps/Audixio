import { expect, test } from '@playwright/test';

for (const path of ['/connexion', '/inscription']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`B1 ${path} ${colorScheme} : pas de défilement horizontal`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => {
        const view = globalThis as unknown as {
          document: { documentElement: { scrollWidth: number } };
          innerWidth: number;
        };
        return view.document.documentElement.scrollWidth - view.innerWidth;
      });
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}
