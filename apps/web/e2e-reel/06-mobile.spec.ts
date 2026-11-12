import { expect, test } from '@playwright/test';
import { AUTH, mobile, readState } from './support.js';

test.use({ storageState: AUTH });

test('parcours clés en 330 px puis suppression du compte', async ({
  page,
  browser,
}) => {
  const state = await readState();
  const auditId = state.auditId ?? '';
  const narrow = await mobile(browser, true);

  await narrow.goto('/');
  await expect(narrow.locator('#url-input')).toBeVisible();
  await expect(
    narrow.getByRole('button', { name: 'Scanner mon site, gratuit' }),
  ).toBeVisible();

  await narrow.goto(`/rapport/${encodeURIComponent(auditId)}`);
  await expect(narrow.locator('#shareBtn')).toBeVisible();
  await narrow.locator('#shareBtn').click();
  await expect(narrow.getByRole('dialog')).toBeVisible();
  await narrow
    .getByRole('button', { name: 'Fermer et revenir au rapport' })
    .click();

  await narrow.goto('/sites');
  await expect(narrow.locator('#addf')).toBeVisible();
  await narrow.goto('/compte');
  await expect(narrow.locator('#lo')).toBeVisible();
  await expect(narrow.locator('#del')).toBeVisible();
  await narrow.goto('/historique');
  await expect(narrow.getByText(/Historique/).first()).toBeVisible();
  await narrow.goto('/compte/alertes');
  await expect(narrow.getByText('Disponible avec Audixio Pro')).toBeVisible();
  await narrow.context().close();

  await page.goto('/compte');
  await page.locator('#del').click();
  await page.locator('#cfm').fill('supprimer');
  await expect(page.locator('#dok')).toBeEnabled();
  await page.locator('#dok').click();
  await page.waitForURL('http://127.0.0.1:8888/');
  await page.goto('/compte');
  await expect(page.locator('#del')).toHaveCount(0);
  await expect(
    page.getByText(/Connectez-vous|Se connecter/).first(),
  ).toBeVisible();
});
