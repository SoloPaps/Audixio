import { expect, test } from '@playwright/test';
import { AUTH, readState, writeState } from './support.js';

test.use({ storageState: AUTH });

test('ajout d’un site, plafond, historique et alertes', async ({ page }) => {
  await page.goto('/sites');
  await expect(page.locator('#addf')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'mauvais.audigy.test', exact: true }),
  ).toBeVisible();
  // La vérification d’un site vit dans sa page (R12) : /sites/id/:site#verification.
  const verify = page.locator('a[href*="/sites/id/"]').first();
  const href = await verify.getAttribute('href');
  const siteId =
    new URL(href ?? '', 'http://127.0.0.1:8888').pathname.split('/')[3] ?? '';
  expect(siteId).toMatch(/^[0-9a-f-]{36}$/);

  await page.locator('#url').fill('https://bon.audigy.test/');
  await page.getByRole('button', { name: 'Ajouter un site' }).click();
  await expect(
    page.getByRole('link', { name: 'bon.audigy.test', exact: true }),
  ).toBeVisible();

  await page.locator('#url').fill('https://troisieme.audigy.test/');
  await page.getByRole('button', { name: 'Ajouter un site' }).click();
  await expect(page.locator('#pro-modal')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'troisieme.audigy.test', exact: true }),
  ).toHaveCount(0);

  // R11 : l’ancien historique d’un site mène à sa page, section historique.
  await page.goto(`/historique?site=${encodeURIComponent(siteId)}`);
  await page.waitForURL(/\/sites\/mauvais\.audigy\.test(\?[^#]*)?#historique$/);
  await expect(page.locator('#historique h2')).toBeVisible();

  // R15 : les alertes sont une section de /compte.
  await page.goto('/compte/alertes');
  await page.waitForURL(/\/compte#alertes$/);
  const alerts = page.locator('#alertes');
  await expect(alerts.getByText('Disponible avec Audixio Pro')).toBeVisible();
  await expect(
    alerts.getByRole('link', { name: /Audixio Pro/ }),
  ).toHaveAttribute('href', '/pro');

  const state = await readState();
  await writeState({ ...state, siteId });
});
