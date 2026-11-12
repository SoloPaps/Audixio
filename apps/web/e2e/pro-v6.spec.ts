import { expect, type Locator, test } from '@playwright/test';

/**
 * /pro (Tarifs) en v6 : gabarit V6Page, panneau de l’offre toujours sombre
 * (.v6-nuit) et lisible en clair, aucun prix affiché (Pro n’est pas ouvert),
 * /passer-pro renvoie ici, 390 px, liens réels.
 */
const css = (target: Locator, prop: string): Promise<string> =>
  target.evaluate(
    (node, name) =>
      (
        globalThis as unknown as {
          getComputedStyle: (el: unknown) => Record<string, string>;
        }
      ).getComputedStyle(node)[name] ?? '',
    prop,
  );
const lum = (rgb: string): number => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

test.describe('/pro v6', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`panneau de l’offre sombre et lisible (${theme})`, async ({
      page,
    }) => {
      await page.goto(`/pro?theme=${theme}`);
      await expect(page.locator('main.pr6')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-page', 'pro');
      const panel = page.locator('.pin.v6-nuit');
      // Le panneau garde les jetons sombres, même en thème clair.
      expect(lum(await css(panel, 'backgroundColor'))).toBeLessThan(0.02);
      const title = page.locator('#pro-features-heading');
      expect(lum(await css(title, 'color'))).toBeGreaterThan(0.6);
      expect(await css(page.locator('h1'), 'fontFamily')).toMatch(/^"?Geist/);
    });
  }

  test('aucun prix inventé : Pro est en liste d’attente', async ({ page }) => {
    await page.goto('/pro');
    const text = await page.locator('main.pr6').innerText();
    expect(text).not.toMatch(/€|\$|\bEUR\b|par mois|\/ ?mois/i);
    await expect(page.locator('#waitlist-form')).toBeVisible();
  });

  test('/passer-pro renvoie un visiteur ici, requête et ancre gardées', async ({
    page,
  }) => {
    await page.goto('/passer-pro?from=sites#hero');
    await expect(page).toHaveURL(/\/pro\?from=sites#hero$/);
    await expect(page.locator('main.pr6')).toBeVisible();
  });

  test('390 px : rien ne déborde, liens réels', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pro');
    await page.locator('main.pr6').waitFor();
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - window.innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const hrefs = await page
      .locator('main.pr6 a[href^="/"], footer a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(
          links.map((link) => (link.getAttribute('href') ?? '').split('#')[0]),
        ),
      ]);
    for (const href of hrefs) {
      const res = await request.get(href || '/');
      expect(res.status(), href).toBeLessThan(400);
    }
  });
});
