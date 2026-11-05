import type { Page } from '@playwright/test';

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
      'access-control-allow-origin':
        request.headers().origin ?? 'http://127.0.0.1:4321',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
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
export async function toEnglish(page: Page): Promise<void> {
  const link = page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' });
  await link.waitFor();
  await page.waitForLoadState('networkidle');
  await link.click();
  await page.waitForFunction(
    () => localStorage.getItem('audigy-locale') === 'en',
  );
  await page.waitForLoadState('networkidle');
}
