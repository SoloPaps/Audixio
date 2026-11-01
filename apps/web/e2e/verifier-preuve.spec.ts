import { expect, type Page, test } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const site = {
  id: SITE_ID,
  url: 'https://exemple.fr',
  label: 'exemple.fr',
  host: 'exemple.fr',
  scope: 'origin',
  path_prefix: null,
  owner_id: USER_ID,
};

async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
}

test('la preuve affiche les méthodes, l’attente et le report de Search Console', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(site),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await signIn(page);
  await page.goto(`/verifier?site=${SITE_ID}`);
  await expect(
    page.getByRole('tab', { name: 'Balise dans la page' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Fichier HTML à la racine' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Fichier .well-known' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'En attente de vérification' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Search Console' }).click();
  await expect(page.getByText('Search Console arrive plus tard')).toBeVisible();
  await page.screenshot({
    path: '/opt/cursor/artifacts/verifier-preuve.png',
    fullPage: true,
  });
});
