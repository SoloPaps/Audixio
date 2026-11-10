import { expect, test } from '@playwright/test';

test('B5 : le badge héros de /confidentialite décrit le bandeau de choix', async ({
  page,
}) => {
  await page.goto('/confidentialite');
  const badge = page.getByText(
    'Zéro traceur tiers · un bandeau pour vos choix',
  );
  await expect(badge).toBeVisible();
  await expect(page.locator('body')).not.toContainText('pas de bannière');
});
