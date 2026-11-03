import { expect, test } from '@playwright/test';
import { AUTH, ageReport, readState } from './support';

test.use({ storageState: AUTH });
test.describe.configure({ mode: 'serial' });

test('lien public 30 jours, lecture anonyme, expiration', async ({
  page,
  browser,
}) => {
  const state = await readState();
  const auditId = state.auditId ?? '';
  expect(auditId).not.toBe('');
  await page.goto(`/rapport?id=${encodeURIComponent(auditId)}`);
  await page.locator('#shareBtn').click();
  const created = page.waitForResponse(
    (res) =>
      res.url().includes('/api/liens') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Créer le lien' }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id?: string; expiresAt?: string };
  const expires = new Date(body.expiresAt ?? '').getTime();
  const days = (expires - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(29);
  expect(days).toBeLessThan(31);
  const share = await page.locator('#share-url').inputValue();
  expect(share).toContain('/partage/');

  const guest = await browser.newContext();
  const reader = await guest.newPage();
  await reader.goto(share);
  await expect(
    reader.getByText('Verrouillé', { exact: true }).first(),
  ).toBeVisible();
  await expect(reader.getByText('PARTIEL')).toHaveCount(0);
  await guest.close();

  ageReport(body.id ?? '');
  await readerWait(page, share);
});

async function readerWait(
  page: import('@playwright/test').Page,
  share: string,
): Promise<void> {
  const token = new URL(share).pathname.split('/').filter(Boolean).at(-1) ?? '';
  const api = await page.request.post('/api/partage', { data: { token } });
  expect(api.status()).toBe(404);
  const payload = (await api.json()) as { error?: string };
  expect(payload.error).toBe('absent');
  await page.goto(share);
  await expect(page.getByText('Ce lien ne fonctionne plus.')).toBeVisible();
}

test('demande d’accès puis lien équipe', async ({ page, browser }) => {
  const state = await readState();
  const auditId = state.auditId ?? '';
  await page.goto('/demande-acces');
  await page.locator('#owner-email').fill('proprio@exemple.test');
  await page.locator('#submit-btn').click();
  await expect(page.getByText(/Demande envoyée/)).toBeVisible();

  await page.goto(
    `/sites/mauvais.audigy.test/demandes/req-e2e?audit=${encodeURIComponent(auditId)}`,
  );
  await page.locator('#ok').click();
  const pane = page.locator('#pane-ok');
  await expect(pane).toHaveAttribute('data-lien', /\/partage\//, {
    timeout: 20_000,
  });
  const team = await pane.getAttribute('data-lien');
  const linkId = (await pane.getAttribute('data-id')) ?? '';
  const guest = await browser.newContext();
  const reader = await guest.newPage();
  await reader.goto(team ?? '/');
  await expect(reader.getByText('PARTIEL')).toBeVisible();
  await guest.close();

  ageReport(linkId);
  const token = (team ?? '').split('/').filter(Boolean).at(-1) ?? '';
  const api = await page.request.post('/api/partage', { data: { token } });
  expect(api.status()).toBe(404);
  const payload = (await api.json()) as { error?: string };
  expect(payload.error).toBe('absent');
});

test('le dialogue de partage retire le lien public', async ({ page }) => {
  const state = await readState();
  const auditId = state.auditId ?? '';
  await page.goto(`/rapport?id=${encodeURIComponent(auditId)}`);
  await page.locator('#shareBtn').click();
  const created = page.waitForResponse(
    (res) =>
      res.url().includes('/api/liens') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Créer le lien' }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { url?: string };
  await page.getByRole('button', { name: 'Retirer le lien' }).click();
  await expect(page.getByText('Le lien ne fonctionne plus.')).toBeVisible();
  const token = (body.url ?? '').split('/').filter(Boolean).at(-1) ?? '';
  const api = await page.request.post('/api/partage', { data: { token } });
  expect(api.status()).toBe(404);
});
