import { expect, test } from '@playwright/test';

test('/reinitialisation : la confirmation ne laisse pas un e-mail vide', async ({
  page,
}) => {
  await page.goto('/reinitialisation?envoye=1');
  const note = page.locator('.note[role="status"]');
  await expect(note).toBeVisible();
  await expect(note).not.toContainText('pour ,');
  await page.evaluate(() =>
    sessionStorage.setItem('audigy-reset-email', 'camille@exemple.fr'),
  );
  await page.reload();
  await expect(note).toContainText(
    'Si un compte existe pour camille@exemple.fr, un e-mail vient de partir.',
  );
});
