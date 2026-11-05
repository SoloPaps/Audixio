import { expect, type Page, test } from '@playwright/test';

/**
 * Décision #38 : un compte Pro qui ouvre /passer-pro arrive sur /compte.
 * Question 1 : visiteur et compte gratuit arrivent sur /pro.
 */

const USER_ID = '11111111-1111-4111-8111-111111111111';
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

async function signIn(page: Page, plan: 'free' | 'pro'): Promise<void> {
  await page.addInitScript((value) => {
    (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? 'http://127.0.0.1:4321';
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
    const url = request.url();
    let body: unknown = session;
    if (url.includes('/auth/v1/user')) body = session.user;
    else if (url.includes('/rest/v1/profiles')) {
      const row = { id: USER_ID, plan };
      body = (request.headers().accept ?? '').includes('pgrst.object')
        ? row
        : [row];
    } else if (url.includes('/rest/v1/')) body = [];
    await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
}

test('un compte Pro est redirigé de /passer-pro vers /compte (#38)', async ({
  page,
}) => {
  await signIn(page, 'pro');
  await page.goto('/passer-pro');
  await expect(page).toHaveURL(/\/compte(?:[?#].*)?$/);
});

test('un compte gratuit est redirigé de /passer-pro vers /pro (question 1)', async ({
  page,
}) => {
  await signIn(page, 'free');
  await page.goto('/passer-pro');
  await expect(page).toHaveURL(/:4321\/pro$/);
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/:4321\/pro$/);
});

test('un visiteur est redirigé de /passer-pro vers /pro (question 1)', async ({
  page,
}) => {
  await page.goto('/passer-pro');
  await expect(page).toHaveURL(/:4321\/pro$/);
  await expect(page.locator('h1')).toBeVisible();
});

test('la redirection vers /pro garde la requête et l’ancre (question 1)', async ({
  page,
}) => {
  await page.goto('/passer-pro?theme=dark#pro-liens');
  await expect(page).toHaveURL(/:4321\/pro\?theme=dark#pro-liens$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
