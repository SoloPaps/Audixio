import { expect, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'gratuit@exemple.fr' },
};

test('le bloc Search Console suit la mise en page du compte (bug #9)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
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
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.goto('/compte?theme=light');
  const button = page
    .locator('#search-console')
    .getByRole('button', { name: 'Connecter Search Console' });
  await expect(button).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  const box = await page.evaluate<{
    left: number;
    column: number;
    radius: number;
  }>(`(() => {
    const button = document.querySelector('#search-console button');
    const heading = document.querySelector('#integrations h2');
    return {
      left: Math.round(button.getBoundingClientRect().left),
      column: Math.round(heading.getBoundingClientRect().left),
      radius: parseFloat(getComputedStyle(button).borderTopLeftRadius),
    };
  })()`);
  expect(box.left).toBe(box.column);
  expect(box.radius).toBeGreaterThan(0);
});
