import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

const USER = '11111111-1111-4111-8111-111111111111';
const SITE = '00000000-0000-4000-8000-0000000000cc';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'ada@exemple.fr' },
};

async function openSites(
  page: Page,
  options: { plan: 'free' | 'pro'; shareLinks?: number } = { plan: 'free' },
): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page
    .context()
    .addCookies([{ name: 'audixio_connecte', value: '1', url: ORIGIN }]);
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
        body: JSON.stringify({ plan: options.plan }),
      });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([
          {
            id: SITE,
            url: 'https://gratuit.audigy.test',
            label: 'gratuit.audigy.test',
            host: 'gratuit.audigy.test',
            is_public: false,
            public_slug: null,
            expose_security: false,
            owner_id: USER,
          },
        ]),
      });
      return;
    }
    if (url.includes('/rest/v1/reports')) {
      const shares = options.shareLinks ?? 0;
      const rows = shares
        ? [
            {
              id: '00000000-0000-4000-8000-0000000000ae',
              audit_id: '00000000-0000-4000-8000-0000000000ad',
              share_token: 'aa'.repeat(16),
              link_kind: 'public',
              visibility: 'link',
              revoked_at: null,
              expires_at: '2027-01-01T00:00:00.000Z',
              created_at: '2026-11-01T00:00:00.000Z',
            },
          ]
        : [];
      await route.fulfill({ status: 200, headers, body: JSON.stringify(rows) });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sites?theme=light');
}

test('quotas gratuits : 1/2 à moitié, 0/1 vide', async ({ page }) => {
  await openSites(page, { plan: 'free' });
  const sites = page.locator('.quota .qrow').nth(0).locator('.ring');
  const links = page.locator('.quota .qrow').nth(1).locator('.ring');
  await expect(sites).toHaveAttribute('data-fill', '50 50');
  await expect(sites.locator('.fg')).toHaveAttribute(
    'stroke-dasharray',
    '50 50',
  );
  await expect(links).toHaveAttribute('data-fill', '0 100');
  await expect(links.locator('.fg')).toHaveAttribute(
    'stroke-dasharray',
    '0 100',
  );
});

test('quotas Pro : liens illimités sans faux anneau plein', async ({
  page,
}) => {
  await openSites(page, { plan: 'pro', shareLinks: 1 });
  const links = page.locator('.quota .qrow').nth(1).locator('.ring');
  await expect(links).toHaveClass(/unlimited/);
  await expect(links).toHaveAttribute('data-fill', '0 100');
  await expect(links.locator('.fg')).toHaveAttribute(
    'stroke-dasharray',
    '0 100',
  );
  await expect(links.locator('small')).toHaveText(/∞/);
});
