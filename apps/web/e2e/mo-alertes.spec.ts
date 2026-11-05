import { expect, type Page, test } from '@playwright/test';

// QA Mo 05/11 M2 : /compte/alertes sans ?site= enregistre vraiment.

const SITE = '00000000-0000-4000-8000-0000000000bb';
const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

async function openAlerts(
  page: Page,
  saved: { url: string; body: unknown }[],
  sites: string[],
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
    if (request.method().toLowerCase() === 'options') {
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
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(sites.map((id) => ({ id }))),
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
            reaudit_cadence: 'weekly',
            ssl_warn_days: 30,
            score_drop_points: 10,
            alerts_enabled: true,
          },
        ]),
      });
      return;
    }
    if (
      url.includes('/rest/v1/alert_settings') &&
      request.method().toLowerCase() === 'patch'
    ) {
      saved.push({ url, body: request.postDataJSON() });
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({ status: 200, headers, body: 'null' });
  });
  await page.goto('/compte/alertes?theme=light');
}

test('M2 : sans ?site=, « Enregistrer » garde 14 jours et le confirme', async ({
  page,
}) => {
  const saved: { url: string; body: unknown }[] = [];
  await openAlerts(page, saved, [SITE]);
  await expect(page.locator('#ssl')).toHaveValue('30', { timeout: 15_000 });
  await expect(page.locator('#fPro')).not.toHaveAttribute('inert', '');
  await page.locator('#ssl').selectOption('14');
  await page.locator('#fPro [type="submit"]').click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0]?.url).toContain(`site_id=eq.${SITE}`);
  expect(saved[0]?.body).toMatchObject({ ssl_warn_days: 14 });
  await expect(page.locator('#toast')).toContainText('Réglages enregistrés');
});

test('M2 : sans site suivi, l’enregistrement le dit au lieu de se taire', async ({
  page,
}) => {
  const saved: { url: string; body: unknown }[] = [];
  await openAlerts(page, saved, []);
  await expect(page.locator('#fPro')).not.toHaveAttribute('inert', '', {
    timeout: 15_000,
  });
  await page.locator('#fPro [type="submit"]').click();
  await expect(page.locator('#toast')).toContainText(
    'Les réglages n’ont pas pu être enregistrés.',
  );
  expect(saved).toEqual([]);
});
