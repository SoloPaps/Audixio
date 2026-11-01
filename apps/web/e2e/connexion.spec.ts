import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('les écrans de connexion suivent le parcours e-mail', async ({ page }) => {
  await page.goto('/connexion');
  await expect(
    page.getByRole('link', { name: 'Continuer avec Google' }),
  ).toHaveAttribute('href', /provider=google/);
  await expect(
    page.getByRole('link', { name: 'Continuer avec GitHub' }),
  ).toHaveAttribute('href', /provider=github/);
  await expect(
    page.getByRole('link', { name: 'Mot de passe oublié ?' }),
  ).toHaveAttribute('href', '/reinitialisation');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.goto('/inscription');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Créer un compte' }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeVisible();

  await page.goto('/reinitialisation');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mot de passe oublié ?' }),
  ).toBeVisible();

  await page.goto('/email-confirme');
  await expect(
    page.getByRole('link', { name: 'Lancer mon premier audit' }),
  ).toHaveAttribute('href', '/#audit-form');

  await page.goto('/bienvenue');
  await expect(page.getByRole('link', { name: 'Plus tard' })).toHaveAttribute(
    'href',
    '/sites',
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bienvenue sur Audixio' }),
  ).toBeVisible();
});
