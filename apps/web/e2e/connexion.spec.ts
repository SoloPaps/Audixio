import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

test('les écrans de connexion suivent le parcours e-mail', async ({ page }) => {
  await page.goto('/connexion');
  await expect(
    page.getByRole('link', { name: 'Continuer avec Google' }),
  ).toHaveAttribute('href', /oauth=google/);
  await expect(
    page.getByRole('link', { name: 'Continuer avec GitHub' }),
  ).toHaveAttribute('href', /oauth=github/);
  await expect(
    page.getByRole('link', { name: 'Mot de passe oublié ?' }),
  ).toHaveAttribute('href', '/reinitialisation');
  await page.goto('/connexion?erreur=lien');
  await expect(
    page.getByRole('button', { name: 'Renvoyer le lien' }),
  ).toBeVisible();
  // Le glissement de l’onglet (0,35 s) fausse le contraste lu par axe.
  await page.waitForTimeout(400);
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

  await stubSession(page);
  await page.goto('/bienvenue');
  await expect(page.getByRole('link', { name: 'Plus tard' })).toHaveAttribute(
    'href',
    '/sites',
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bienvenue sur Audixio' }),
  ).toBeVisible();
});

test('une adresse locale valide ne passe pas au rouge', async ({ page }) => {
  await page.route('**/api/auth/connexion', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'invalid_credentials' }),
    });
  });
  await page.goto('/connexion');
  await expect(
    page.getByText('Accédez à vos sites suivis et à vos rapports.'),
  ).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  await expect(page.getByText('Email address')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send the link' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'Privacy' })).toHaveCount(0);
  // La carte a son lien ; le pied v6 a le sien (gabarit v6 depuis le lot 5).
  await expect(
    page.locator('main').getByRole('link', { name: 'Confidentialité' }),
  ).toBeVisible();
  const email = page.getByLabel('Adresse e-mail');
  await email.fill('gratuit@localhost');
  await page.getByLabel('Mot de passe').fill('Audixio-local-gratuit');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Adresse ou mot de passe incorrect.',
  );
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
  const border = await email.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (el: unknown) => { borderTopColor: string };
    };
    return view.getComputedStyle(node).borderTopColor;
  });
  expect(border).not.toBe('rgb(180, 35, 24)');
  // Rouge des erreurs v6 (--find) non plus.
  expect(border).not.toBe('rgb(194, 52, 31)');
});

test('la carte de connexion reprend le survol et le focus de la maquette', async ({
  page,
}) => {
  await page.goto('/connexion');
  const submit = page.getByRole('button', { name: 'Se connecter' });
  const before = await submit.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (el: unknown) => { transform: string };
    };
    return view.getComputedStyle(node).transform;
  });
  await submit.hover();
  const after = await submit.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (el: unknown) => { transform: string };
    };
    return view.getComputedStyle(node).transform;
  });
  expect(after).not.toBe(before);
  const email = page.getByLabel('Adresse e-mail');
  await email.focus();
  // Focus sur le bleu v6 (--beam), plus le bleu v2 #3d52a0.
  await expect(email).toHaveCSS('border-top-color', 'rgb(29, 95, 209)');
});
