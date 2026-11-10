import { expect, test } from '@playwright/test';

test('M2 : « Générer et copier le prompt » confirme la copie', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport#n2');
  const gen = page.locator('#gen');
  await gen.scrollIntoViewIfNeeded();
  await expect(gen).toBeVisible();
  await gen.click();
  await expect(page.locator('#plive')).toHaveText(
    'Prompt copié dans le presse-papiers',
  );
  expect(errors, errors.join('\n')).toEqual([]);
});
