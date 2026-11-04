import { expect, test } from '@playwright/test';

test('le centre de la rosace de l’exemple est traduit en anglais (bug #43/#95/#121)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=light');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const score = page.locator('text.c-score');
  await expect(score).toHaveText('7 areas tested', { timeout: 15_000 });
});
