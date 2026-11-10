import { expect, type Page, test } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

async function openAccount(page: Page, patches: unknown[]): Promise<void> {
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
  await page.route('**/api/compte/cgu', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '2026.1',
        accepted: true,
        acceptedAt: '2026-11-04T10:00:00.000Z',
      }),
    });
  });
  let notify = true;
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
    if (request.url().includes('/rest/v1/profiles')) {
      if (request.method() === 'PATCH' || request.method() === 'POST') {
        patches.push(request.postDataJSON());
        const body = request.postDataJSON() as { notify_audit_end?: boolean };
        if (typeof body.notify_audit_end === 'boolean') {
          notify = body.notify_audit_end;
        }
      }
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'pro', notify_audit_end: notify }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.goto('/compte?theme=light');
}

test('le réglage « M’avertir par e-mail à la fin d’un audit » s’enregistre', async ({
  page,
}) => {
  const patches: unknown[] = [];
  await openAccount(page, patches);
  const box = page.locator('#notify-audit-end');
  await expect(box).toBeVisible({ timeout: 15_000 });
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect.poll(() => patches.length).toBeGreaterThan(0);
  expect(
    patches.some((item) => {
      return (
        item !== null &&
        typeof item === 'object' &&
        (item as { notify_audit_end?: boolean }).notify_audit_end === false
      );
    }),
  ).toBe(true);
  await expect(page.locator('#notify-audit-end-status')).toContainText(
    'Le réglage est enregistré',
  );
});
