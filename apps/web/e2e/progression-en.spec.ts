import { expect, test } from '@playwright/test';

test('la fin de la progression reste en anglais (bug #35/#56/#81)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/progression?maquette=1&theme=light');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('body')).toHaveClass(/\bdone\b/, {
    timeout: 60_000,
  });
  await expect(page.locator('#h1T')).toHaveText('Your diagnosis is ready for');
  await expect(page.locator('#leadT')).toHaveText(
    'The analysis is finished. Your full report, with the priorities and the action plan, is waiting.',
  );
  await expect(page.locator('#liveT')).toHaveText('Analysis finished');
  await expect(page.locator('main')).not.toContainText('Diagnostic terminé');
});
