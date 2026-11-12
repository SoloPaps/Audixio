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
  // /methode v6 : la ligne LCP est dans le détail des tests de Performance.
  await expect(main).toContainText('LCP: main content display');
  await expect(main).not.toContainText('affichage du contenu principal');
});
