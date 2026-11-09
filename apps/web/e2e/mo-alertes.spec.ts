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
  stored?: Record<string, unknown>,
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
          stored ?? {
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
      const body = request.postDataJSON() as Record<string, unknown>;
      saved.push({ url, body });
      if (stored) Object.assign(stored, body);
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

test('M4 (bug_6113d91a) : seuil de baisse 17 enregistré, l’éditeur garde 17 après rechargement', async ({
  page,
}) => {
  const saved: { url: string; body: unknown }[] = [];
  const stored: Record<string, unknown> = {
    site_id: SITE,
    user_id: USER,
    reaudit_cadence: 'weekly',
    ssl_warn_days: 30,
    score_drop_points: 10,
    alerts_enabled: true,
  };
  await openAlerts(page, saved, [SITE], stored);
  await expect(page.locator('#ssl')).toHaveValue('30', { timeout: 15_000 });
  await expect(page.locator('#fPro')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#drop')).toHaveValue('10');
  await page.locator('#drop').fill('17');
  await expect(page.locator('#dropv')).toHaveText('17');
  await page.locator('#fPro [type="submit"]').click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0]?.body).toMatchObject({ score_drop_points: 17 });
  await expect(page.locator('#toast')).toContainText('Réglages enregistrés');

  await page.reload();
  await expect(page.locator('#ssl')).toHaveValue('30', { timeout: 15_000 });
  await expect(page.locator('.rows .val').nth(1)).toHaveText('−17 points');
  await expect(page.locator('#drop')).toHaveValue('17');
  await expect(page.locator('#dropv')).toHaveText('17');
});
