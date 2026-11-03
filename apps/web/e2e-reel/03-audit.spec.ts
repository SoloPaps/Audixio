import { expect, test } from '@playwright/test';
import { AUTH, LAB, readState, writeState } from './support';

test.use({ storageState: AUTH });

test('visiteur non connecté est renvoyé vers la connexion', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#url-input').fill(LAB);
  await page.getByRole('button', { name: "Lancer l'audit gratuit" }).click();
  await expect(page).toHaveURL(/\/connexion/);
  await context.close();
});

test('audit, hub, domaine ouvert, domaine verrouillé, constat, brief, plan, impression', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#url-input').fill(LAB);
  await page.getByRole('button', { name: "Lancer l'audit gratuit" }).click();
  await page.waitForURL(/\/progression\?id=/, { timeout: 60_000 });
  const auditId = new URL(page.url()).searchParams.get('id') ?? '';
  expect(auditId).not.toBe('');
  await expect(page.locator('#report-link')).toBeVisible({ timeout: 120_000 });
  await page.locator('#report-link').click();
  await expect(page).toHaveURL(/\/rapport\?id=/);
  await expect(
    page.getByText(/partielle · \d+ domaines · site non vérifié/),
  ).toBeVisible();

  await page.locator('#domaine-seo').click();
  await expect(page).toHaveURL(/domaine=seo/);
  await expect(page.getByText('Verrouillé', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Corriger' }).first().click();
  await expect(page).toHaveURL(/\/constat\?/);

  await page.goto(`/rapport?id=${encodeURIComponent(auditId)}`);
  await page.locator('#domaine-securite').click();
  await expect(page).toHaveURL(/domaine=securite/);
  await expect(page.getByText('Verrouillé', { exact: true })).toBeVisible();

  await page.goto(`/rapport?id=${encodeURIComponent(auditId)}`);
  await page.getByRole('link', { name: 'Ouvrir le brief IA' }).click();
  await expect(page).toHaveURL(/\/brief\?id=/);
  await expect(page.locator('#md')).toContainText('PARTIEL', {
    timeout: 30_000,
  });
  await page.getByRole('link', { name: /plan d.action/ }).click();
  await expect(page).toHaveURL(/\/plan\?id=/);

  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.imprime = 'oui';
    };
  });
  await page.goto(`/rapport/${auditId}/imprimer`);
  await page.locator('#printBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-imprime', 'oui');

  const state = await readState();
  await writeState({ ...state, auditId });
});

test('un second audit du même site répond 429', async ({ page }) => {
  await page.goto(`/?rien=${Date.now()}`);
  await page.locator('#url-input').fill(LAB);
  await page.getByRole('button', { name: "Lancer l'audit gratuit" }).click();
  await expect(
    page.getByText(
      'Ce site a été audité il y a moins de 15 minutes. Réessayez plus tard.',
    ),
  ).toBeVisible({ timeout: 60_000 });
});
