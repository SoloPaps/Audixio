import { expect, test } from '@playwright/test';

// Retour owner du 11 nov. : la lettre A se lit « Excellent », plus « Bon ».
// Barème inchangé (A 90 · B 80 · C 65 · D 50 · E 35).

test('/methode : la ligne A dit « Excellent », la ligne B reste « Bon »', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/methode?theme=dark');
  const row = (grade: string) => page.locator(`.gt tr[data-g="${grade}"] td`);
  await expect(row('A').nth(1)).toHaveText('Excellent');
  await expect(row('A').nth(0)).toHaveText('90 et plus');
  await expect(row('B').nth(1)).toHaveText('Bon');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(row('A').nth(1)).toHaveText('Excellent');
  await expect(row('B').nth(1)).toHaveText('Good');
});

test('cadran : une note A affiche « Excellent » à côté de la lettre', async ({
  page,
}) => {
  await page.goto('/dev/composants?theme=light');
  const full = page.locator('.gauge[data-score="100"]');
  await expect(full).toHaveAttribute('data-grade', 'A');
  await expect(full.locator('.gauge-status')).toContainText('Excellent');
  await expect(full.locator('.gauge-status')).not.toContainText('Bon');
});
