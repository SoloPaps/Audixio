import { expect, test } from '@playwright/test';
import { mobile } from './support.js';

test('pages légales, 404, 500, cookies et Pro', async ({ page, browser }) => {
  await page.goto('/mentions-legales');
  await expect(
    page.getByRole('heading', { name: 'Mentions légales', level: 1 }),
  ).toBeVisible();
  await page.goto('/confidentialite');
  await expect(
    page.getByRole('heading', {
      name: 'Politique de confidentialité',
      level: 1,
    }),
  ).toBeVisible();
  await page.goto('/cgu');
  await expect(
    page.getByRole('heading', { name: /Conditions d.utilisation/, level: 1 }),
  ).toBeVisible();
  await page.goto('/accessibilite');
  await expect(
    page.getByRole('heading', {
      name: /D.claration d.accessibilit./,
      level: 1,
    }),
  ).toBeVisible();

  const missing = await page.goto('/cette-page-n-existe-pas');
  expect(missing?.status()).toBe(404);
  await expect(page.getByText('Page introuvable').first()).toBeVisible();

  await page.goto('/500/');
  await expect(page.getByText('Erreur serveur').first()).toBeVisible();

  await page.goto('/cookies');
  await expect(
    page.getByRole('heading', { name: 'Vos choix sur les cookies' }),
  ).toBeVisible();
  await page.locator('#ps').click();
  await expect(page.locator('#ps')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#ac').click();
  const consent = await page.evaluate(() =>
    localStorage.getItem('audixio_consent'),
  );
  expect(consent).toContain('"pref":true');

  await page.goto('/pro');
  await expect(
    page.getByRole('heading', { name: /Audixio Pro/ }),
  ).toBeVisible();
  await page.locator('#email-input').fill('liste@exemple.test');
  await page.locator('#wbtn').click();
  await expect(page.locator('#wl')).toHaveClass(/done/);

  /* Question 1 : un visiteur qui ouvre /passer-pro arrive sur /pro et s’y inscrit. */
  await page.goto('/passer-pro');
  await expect(page).toHaveURL(/:\d+\/pro$/);
  await expect(
    page.getByRole('heading', { name: /Audixio Pro/ }),
  ).toBeVisible();
  await page.locator('#email-input').fill('liste@exemple.test');
  await page.locator('#email-input').press('Enter');
  await expect(page.locator('#wl')).toHaveClass(/done/);
  await page.goto('/passer-pro?src=reel#pro-liens');
  await expect(page).toHaveURL(/:\d+\/pro\?src=reel#pro-liens$/);

  const narrow = await mobile(browser, false);
  await narrow.goto('/mentions-legales');
  await expect(
    narrow.getByRole('heading', { name: 'Mentions légales', level: 1 }),
  ).toBeVisible();
  await narrow.goto('/cookies');
  await expect(narrow.locator('#ac')).toBeVisible();
  await narrow.locator('#rf').click();
  await narrow.goto('/pro');
  await expect(narrow.locator('#email-input')).toBeVisible();
  await narrow.goto('/cette-page-n-existe-pas');
  await expect(narrow.getByText('Page introuvable').first()).toBeVisible();
  await narrow.goto('/500/');
  await expect(narrow.getByText('Erreur serveur').first()).toBeVisible();
  await narrow.context().close();
});
