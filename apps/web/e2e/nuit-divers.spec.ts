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

test('/sites/…/demandes : « rapport d’audit de exemple.fr » garde son espace', async ({
  page,
}) => {
  await page.goto('/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light');
  await expect(page.locator('main .lede').first()).toContainText(
    'rapport d’audit de exemple.fr',
  );
});

test('/demande-acces 330 px : changer de thème depuis le menu garde la position', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 700 });
  await page.goto('/demande-acces?theme=light');
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.locator('.axn-sheet .axn-theme').click();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
});
