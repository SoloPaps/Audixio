import { expect, test } from '@playwright/test';
import { AUTH, readState, writeState } from './support';

test.use({ storageState: AUTH });

test('ajout d’un site, plafond, historique et alertes', async ({ page }) => {
  await page.goto('/sites');
  await expect(page.locator('#addf')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'mauvais.audigy.test' }),
  ).toBeVisible();
  const verify = page.locator('a[href*="/verifier?site="]').first();
  const href = await verify.getAttribute('href');
  const siteId = new URL(href ?? '', 'http://127.0.0.1:8888').searchParams.get(
    'site',
  );
  expect(siteId).toBeTruthy();

  await page.locator('#url').fill('https://bon.audigy.test/');
  await page.getByRole('button', { name: 'Ajouter un site' }).click();
  await expect(
    page.getByRole('link', { name: 'bon.audigy.test' }),
  ).toBeVisible();

  await page.locator('#url').fill('https://troisieme.audigy.test/');
  await page.getByRole('button', { name: 'Ajouter un site' }).click();
  await expect(page.locator('#pro-modal')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'troisieme.audigy.test' }),
  ).toHaveCount(0);

  await page.goto(`/historique?site=${encodeURIComponent(siteId ?? '')}`);
  await expect(page.getByText(/Historique/).first()).toBeVisible();

  await page.goto('/compte/alertes');
  await expect(page.getByText('Disponible avec Audixio Pro')).toBeVisible();
  await expect(page.getByRole('link', { name: /Audixio Pro/ })).toHaveAttribute(
    'href',
    '/pro',
  );

  const state = await readState();
  await writeState({ ...state, siteId: siteId ?? '' });
});
