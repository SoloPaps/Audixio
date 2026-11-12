import { expect, type Page, test } from '@playwright/test';
import { E2E_PORT, ORIGIN } from './origin.js';

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
  await expect(page).toHaveURL(new RegExp(`:${E2E_PORT}/pro$`));
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(new RegExp(`:${E2E_PORT}/pro$`));
});

test('un visiteur est redirigé de /passer-pro vers /pro (question 1)', async ({
  page,
}) => {
  await page.goto('/passer-pro');
  await expect(page).toHaveURL(new RegExp(`:${E2E_PORT}/pro$`));
  await expect(page.locator('h1')).toBeVisible();
});

test('la redirection vers /pro garde la requête et l’ancre (question 1)', async ({
  page,
}) => {
  await page.goto('/passer-pro?theme=dark#pro-liens');
  await expect(page).toHaveURL(
    new RegExp(`:${E2E_PORT}/pro\\?theme=dark#pro-liens$`),
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

/**
 * C1 : la connexion réelle passe par le cookie (`sb-127-auth-token`
 * httpOnly + drapeau `audixio_connecte=1`) et /api/auth/session. Aucun
 * jeton `audigy-auth` en localStorage.
 */
async function signInByCookie(page: Page, plan: 'free' | 'pro'): Promise<void> {
  await page.context().addCookies([
    {
      name: 'sb-127-auth-token',
      value:
        'base64-eyJhY2Nlc3NfdG9rZW4iOiJoZWFkZXIucGF5bG9hZC5zaWduYXR1cmUifQ',
      url: ORIGIN,
      httpOnly: true,
      sameSite: 'Lax',
    },
    { name: 'audixio_connecte', value: '1', url: ORIGIN },
  ]);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: 'bearer',
        refresh_token: '',
        displayName: '',
        user: session.user,
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
    const url = request.url();
    let body: unknown = [];
    if (url.includes('/auth/v1/user')) body = session.user;
    else if (url.includes('/rest/v1/profiles')) {
      const row = { id: USER_ID, plan };
      body = (request.headers().accept ?? '').includes('pgrst.object')
        ? row
        : [row];
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
}

test('C1 : un Pro connecté par cookie (sans localStorage) va sur /compte', async ({
  page,
}) => {
  await signInByCookie(page, 'pro');
  await page.goto('/passer-pro?from=sites#offre');
  await expect(page).toHaveURL(/\/compte(?:[?#].*)?$/);
  expect(
    await page.evaluate(() => localStorage.getItem('audigy-auth')),
  ).toBeNull();
});

test('C1 : un gratuit connecté par cookie va sur /pro avec la requête', async ({
  page,
}) => {
  await signInByCookie(page, 'free');
  await page.goto('/passer-pro?from=sites#offre');
  await expect(page).toHaveURL(
    new RegExp(`:${E2E_PORT}/pro\\?from=sites#offre$`),
  );
});
