import { expect, test } from '@playwright/test';

/**
 * Barre collante v6 : donner le focus à un de ses liens (Tab, ouverture du
 * menu) ne fait pas remonter la page. Avant, le scroll-padding-top de la
 * page faisait sauter la vue de ~365 px à 330 px de large.
 */
const scrollY = `(() => window.scrollY)()`;

for (const path of ['/', '/methode', '/pro']) {
  for (const width of [330, 1280]) {
    test(`${path} à ${width} px : focus dans la barre sans saut`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(`${path}?theme=light`);
      await page.evaluate(`(() => window.scrollTo(0, 1200))()`);
      await expect.poll(() => page.evaluate<number>(scrollY)).toBe(1200);
      const target = width < 700 ? '.axn-burger' : '.axn-logo';
      await page.evaluate(
        `(() => document.querySelector('${target}').focus())()`,
      );
      expect(await page.evaluate<number>(scrollY)).toBe(1200);
      if (width < 700) {
        await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
        expect(await page.evaluate<number>(scrollY)).toBe(1200);
      }
    });
  }
}
