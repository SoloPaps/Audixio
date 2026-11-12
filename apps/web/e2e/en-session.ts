import { expect, type Page } from '@playwright/test';
import { ORIGIN } from './origin.js';

const USER = '11111111-1111-4111-8111-111111111111';

// Session simulée (gratuit ou pro) pour les pages connectées.
export async function stubSession(
  page: Page,
  plan: 'free' | 'pro' = 'free',
): Promise<void> {
  const session = {
    access_token: 'header.payload.signature',
    expires_at: 2_000_000_000,
    user: { id: USER, email: 'gratuit@exemple.fr' },
  };
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
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
    }),
  );
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? ORIGIN,
      'access-control-allow-headers': '*',
      // Joker CORS (pas de cookies) : comme allow-headers, aucune liste de méthodes.
      'access-control-allow-methods': '*',
      'content-type': 'application/json',
    };
    if (request.method().toLowerCase() === 'options') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const body = request.url().includes('/rest/v1/profiles')
      ? JSON.stringify({ plan })
      : '[]';
    await route.fulfill({ status: 200, headers, body });
  });
}

// Bascule la page en anglais par le sélecteur de langue.
// Le choix recharge la page (location.reload, ou ?lang=en avant l’hydratation) :
// on attend un document neuf, sinon le goto suivant est coupé par ce rechargement.
export async function toEnglish(page: Page): Promise<void> {
  const link = page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' });
  await link.waitFor();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    (globalThis as Record<string, unknown>).__avantLangue = true;
  });
  await link.click();
  await expect
    .poll(
      () =>
        page
          .evaluate(() => {
            const view = globalThis as unknown as {
              __avantLangue?: boolean;
              document: { readyState: string };
              location: { href: string };
              localStorage: { getItem: (key: string) => string | null };
            };
            return (
              !view.__avantLangue &&
              view.document.readyState === 'complete' &&
              !new URL(view.location.href).searchParams.has('lang') &&
              view.localStorage.getItem('audigy-locale') === 'en'
            );
          })
          .catch(() => false),
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.waitForLoadState('networkidle');
}
