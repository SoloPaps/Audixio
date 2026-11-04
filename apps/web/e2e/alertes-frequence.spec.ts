import { expect, type Page, test } from '@playwright/test';

const SITE = '00000000-0000-4000-8000-0000000000bb';
const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

async function openAlerts(
  page: Page,
  cadence: 'daily' | 'weekly' | 'monthly',
  saved: unknown[],
): Promise<void> {
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
        body: JSON.stringify({ plan: 'pro' }),
      });
      return;
    }
    if (url.includes('ensure_alert_settings')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([
          {
            site_id: SITE,
            user_id: USER,
            reaudit_cadence: cadence,
            ssl_warn_days: 14,
            score_drop_points: 10,
            alerts_enabled: true,
          },
        ]),
      });
      return;
    }
    if (
      url.includes('/rest/v1/alert_settings') &&
      request.method() === 'PATCH'
    ) {
      saved.push(request.postDataJSON());
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({ status: 200, headers, body: 'null' });
  });
  await page.goto(`/compte/alertes?site=${SITE}&theme=light`);
}

test('la fréquence enregistrée est cochée au chargement (bug #13)', async ({
  page,
}) => {
  await openAlerts(page, 'daily', []);
  await expect(page.locator('input[name="fq"][value="j"]')).toBeChecked({
    timeout: 15_000,
  });
});

test('Enregistrer envoie la fréquence choisie (bug #13)', async ({ page }) => {
  const saved: unknown[] = [];
  await openAlerts(page, 'weekly', saved);
  await expect(page.locator('#fPro')).not.toHaveAttribute('inert', '', {
    timeout: 15_000,
  });
  await page.locator('input[name="fq"][value="j"]').check({ force: true });
  await page.locator('#fPro [type="submit"]').click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0]).toMatchObject({ reaudit_cadence: 'daily' });
});
