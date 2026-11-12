import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

let accepted: string | null = null;
const posts: unknown[] = [];

async function openAccount(page: Page): Promise<void> {
  accepted = null;
  posts.length = 0;
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: 3600,
        user: {
          id: USER,
          aud: 'authenticated',
          role: 'authenticated',
          email: session.user.email,
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    });
  });
  await page.route('**/api/compte/cgu', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      posts.push(request.postDataJSON());
      accepted = '2026-11-04T10:00:00.000Z';
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '2026.1',
        accepted: accepted !== null,
        acceptedAt: accepted,
      }),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? ORIGIN;
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (request.url().includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'pro' }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.goto('/compte?theme=light');
}

test('la date d’acceptation vient du serveur, pas de la maquette (bug #109)', async ({
  page,
}) => {
  await openAccount(page);
  await expect(page.locator('#acd')).toHaveText('—', { timeout: 15_000 });
});

test('Mettre à jour l’acceptation enregistre les conditions (bug #109, #151)', async ({
  page,
}) => {
  await openAccount(page);
  await expect(page.locator('#acd')).toHaveText('—', { timeout: 15_000 });
  await page.locator('#acc').click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({ version: '2026.1' });
  await expect(page.locator('#acd')).toHaveText('4 nov. 2026');
});
