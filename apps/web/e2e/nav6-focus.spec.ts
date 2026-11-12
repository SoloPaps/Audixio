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
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 700 });
      await page.goto(`${path}?theme=light`);
      await page.evaluate(`(() => window.scrollTo(0, 1200))()`);
      await expect.poll(() => page.evaluate<number>(scrollY)).toBe(1200);
      const target = width < 700 ? '.axn-burger' : '.axn-logo';
      // Mesure synchrone : rien d’autre ne peut faire défiler entre les deux lectures.
      const [before, after] = await page.evaluate<[number, number]>(
        `(() => { const y = window.scrollY; document.querySelector('${target}').focus(); return [y, window.scrollY]; })()`,
      );
      expect(after).toBe(before);
      if (width < 700) {
        // Clic DOM (le clic Playwright fait lui-même défiler jusqu’à la cible),
        // répété tant que l’îlot de la barre n’est pas hydraté.
        const burger = page.locator('.axn-burger');
        await expect(async () => {
          await page.evaluate(
            `(() => { const b = document.querySelector('.axn-burger'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); })()`,
          );
          await expect(burger).toHaveAttribute('aria-expanded', 'true', {
            timeout: 500,
          });
        }).toPass();
        await page.waitForTimeout(200);
        expect(await page.evaluate<number>(scrollY)).toBe(before);
      }
    });
  }
}
