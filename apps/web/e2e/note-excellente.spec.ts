import { expect, test } from '@playwright/test';

// Retour owner du 11 nov. : la lettre A se lit « Excellent », plus « Bon ».
// Barème inchangé (A 90 · B 80 · C 65 · D 50 · E 35).

test('/methode : la carte A dit « Excellent », la carte B reste « Bon »', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/methode?theme=dark');
  const cards = page.locator('.grades .gcard');
  await expect(cards.nth(0).locator('.glvl')).toHaveText('Excellent');
  await expect(cards.nth(0).locator('.grange')).toContainText('90 à 100');
  await expect(cards.nth(1).locator('.glvl')).toHaveText('Bon');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(cards.nth(0).locator('.glvl')).toHaveText('Excellent');
  await expect(cards.nth(1).locator('.glvl')).toHaveText('Good');
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
