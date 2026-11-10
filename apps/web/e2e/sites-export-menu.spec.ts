import { expect, type Page, test } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';
const SITES = [
  '00000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000c2',
];

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

async function openTwoSites(page: Page): Promise<void> {
  const rows = SITES.map((id, index) => ({
    id,
    url: `https://site-${index + 1}.audigy.test`,
    label: `site-${index + 1}.audigy.test`,
    host: `site-${index + 1}.audigy.test`,
    is_public: false,
    public_slug: null,
    expose_security: false,
    owner_id: USER,
  }));
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
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(rows),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.goto('/sites?theme=light');
}

test('M5 : le menu Exporter de la deuxième carte s’ouvre et exporte', async ({
  page,
}) => {
  await openTwoSites(page);
  const second = page.locator(`#expb-${SITES[1]}`);
  await expect(second).toBeVisible({ timeout: 15_000 });
  await second.click();
  const menu = page.locator(`#expm-${SITES[1]}`);
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'PDF' }).click();
  await expect(page.locator('#toast')).toContainText(/PDF/);
});
