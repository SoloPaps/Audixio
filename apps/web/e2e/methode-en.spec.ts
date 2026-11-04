import { expect, test } from '@playwright/test';

test('la cible LCP de /methode est traduite en anglais (bug #15/#125)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/methode?theme=light');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const main = page.locator('main');
  await expect(main).toContainText('LCP target');
  await expect(main).not.toContainText('cible LCP');
});
