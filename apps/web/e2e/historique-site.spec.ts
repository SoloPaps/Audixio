import { expect, test } from '@playwright/test';

const SITE = '00000000-0000-4000-8000-0000000000bb';
const FIRST = '00000000-0000-4000-8000-0000000000c1';
const SECOND = '00000000-0000-4000-8000-0000000000c2';
const DEMO =
  '70.0,168.0 234.0,156.5 398.0,145.0 562.0,133.5 726.0,122.0 890.0,99.0';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ada@exemple.fr',
  },
};

test('un site réel redessine la courbe d’historique', async ({ page }) => {
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
          id: session.user.id,
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
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    if (url.includes('/rest/v1/audits')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([
          {
            id: FIRST,
            status: 'done',
            created_at: '2026-01-15T10:00:00.000Z',
            finished_at: '2026-01-15T10:05:00.000Z',
          },
          {
            id: SECOND,
            status: 'done',
            created_at: '2026-05-15T10:00:00.000Z',
            finished_at: '2026-05-15T10:05:00.000Z',
          },
        ]),
      });
      return;
    }
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const score = raw.includes(SECOND) ? 88 : 72;
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ score_global: score }),
      });
      return;
    }
    if (url.includes('domain_scores') || url.includes('findings')) {
      await route.fulfill({ status: 200, headers, body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, headers, body: 'null' });
  });

  await page.goto(`/historique?site=${SITE}&theme=light`);
  const values = page.locator('text.val');
  await expect(values.nth(0)).toHaveText('72', { timeout: 15_000 });
  await expect(values.nth(1)).toHaveText('88');
  const points = await page.locator('polyline.ln').getAttribute('points');
  expect(points).toContain('70.0,237.0');
  expect(points).toContain('890.0,53.0');
  expect(points).not.toContain('168.0');
  expect(points).not.toBe(DEMO);
});
