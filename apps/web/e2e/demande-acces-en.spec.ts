import { expect, test } from '@playwright/test';

test('le titre de la demande d’accès est entièrement anglais (bug #88)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.goto('/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('link', { name: 'EN — English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const title = page.locator('main h1');
  await expect(title).toContainText(/access\s*to\s*your/);
  await expect(title).not.toContainText('à');
});
