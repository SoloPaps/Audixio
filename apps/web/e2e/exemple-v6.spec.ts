import { expect, type Locator, test } from '@playwright/test';

/**
 * /exemple-rapport en v6 : gabarit V6Page, Geist, jetons v6 en clair et en
 * sombre (plus l’ancienne palette lavande), pas de débordement, liens réels.
 * Parcours, rosace, prompt et anglais : specs exemple-* existantes.
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

test.describe('/exemple-rapport v6', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`gabarit v6 et jetons v6 (${theme})`, async ({ page }) => {
      await page.goto(`/exemple-rapport?theme=${theme}`);
      const main = page.locator('main.ex');
      await expect(main).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute(
        'data-page',
        'exemple',
      );
      await expect(page.locator('html')).toHaveAttribute('data-v6', '');
      expect(await css(page.locator('h1'), 'fontFamily')).toMatch(/^"?Geist/);
      // Encre et cartes = jetons v6 du thème (plus #1e2a55 ni #ede8f5).
      const ink = await css(main, 'color');
      expect(ink).not.toBe('rgb(30, 42, 85)');
      const card = page.locator('.rcard').first();
      const bg = await css(card, 'backgroundColor');
      expect(bg).not.toBe('rgb(237, 232, 245)');
      await expect(page.locator('footer[data-dock-hide] .cols')).toBeVisible();
    });
  }

  test('390 px : rien ne déborde', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/exemple-rapport');
    await page.locator('main.ex').waitFor();
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - window.innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('chaque lien de la page mène à une page qui existe', async ({
    page,
    request,
  }) => {
    await page.goto('/exemple-rapport');
    const hrefs = await page
      .locator('main.ex a[href^="/"], footer a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(
          links.map((link) => (link.getAttribute('href') ?? '').split('#')[0]),
        ),
      ]);
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) {
      const res = await request.get(href || '/');
      expect(res.status(), href).toBeLessThan(400);
    }
    const anchors = await page
      .locator('main.ex a[href^="#"]')
      .evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute('href') ?? '')),
      ]);
    for (const anchor of anchors.filter((a) => a.length > 1))
      await expect(page.locator(anchor), anchor).toHaveCount(1);
  });
});
