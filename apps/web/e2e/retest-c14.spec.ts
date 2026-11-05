import { expect, test } from '@playwright/test';

// Retest C14 : /cookies encadrait l’accueil dans un <iframe>. L’en-tête de
// production (frame-ancestors 'none', X-Frame-Options DENY) bloque ce cadre et
// la console affiche une erreur CSP. On rejoue ici les en-têtes de prod.

const PROD_HEADERS = {
  'content-security-policy': "frame-ancestors 'none'",
  'x-frame-options': 'DENY',
};

for (const theme of ['light', 'dark']) {
  test(`C14 : /cookies sans erreur frame-ancestors (${theme})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') {
        await route.fallback();
        return;
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), ...PROD_HEADERS },
      });
    });
    await page.goto(`/cookies?theme=${theme}`);
    await expect(
      page.getByRole('button', { name: 'Tout accepter' }),
    ).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(
      errors.filter((text) => /frame-ancestors|Framing/u.test(text)),
    ).toEqual([]);
  });
}
