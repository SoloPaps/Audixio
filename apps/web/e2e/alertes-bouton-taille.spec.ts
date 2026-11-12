import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

// Retour owner du 11 nov. : « Enregistrer les réglages » devenait un énorme
// bloc au clic. L'onde du clic (span .rip, carré du côté du bouton) entrait
// dans le flux du bouton flex quand la page n'avait pas de règle .rip.
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
  theme = 'light',
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
    const origin = request.headers().origin ?? ORIGIN;
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
  await page.goto(`/compte/alertes?theme=${theme}`);
}

for (const theme of ['light', 'dark']) {
  test(`alertes (${theme}) : le bouton garde sa taille pendant et après le clic`, async ({
    page,
  }) => {
    // Animations actives : c'est l'onde du clic qui déformait le bouton.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const saved: { url: string; body: unknown }[] = [];
    await openAlerts(page, saved, [SITE], undefined, theme);
    await expect(page.locator('#ssl')).toHaveValue('30', { timeout: 15_000 });
    await expect(page.locator('#fPro')).not.toHaveAttribute('inert', '');
    const button = page.locator('#fPro [type="submit"]');
    await button.scrollIntoViewIfNeeded();
    const before = await button.boundingBox();
    expect(before).not.toBeNull();
    await button.hover();
    await page.mouse.down();
    await expect(button.locator('.rip')).toHaveCount(1);
    const pressed = await button.boundingBox();
    await page.mouse.up();
    await expect.poll(() => saved.length).toBe(1);
    await expect(page.locator('#toast')).toContainText('Réglages enregistrés');
    const after = await button.boundingBox();
    for (const box of [pressed, after]) {
      expect(Math.abs((box?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(
        2,
      );
      expect(Math.abs((box?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
        2,
      );
    }
  });
}
