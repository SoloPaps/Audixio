import { expect, type Page, test } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const site = {
  id: SITE_ID,
  url: 'https://exemple.fr',
  label: 'exemple.fr',
  host: 'exemple.fr',
  scope: 'origin',
  path_prefix: null,
  owner_id: USER_ID,
};

async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
}

// #30 : en sombre, la barre collante du bas de /verifier garde un fond opaque.
test('#30 barre du bas opaque en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: path.endsWith('/rest/v1/sites') ? JSON.stringify(site) : '[]',
    });
  });
  await signIn(page);
  await page.goto(`/verifier?site=${SITE_ID}&theme=dark`);
  const dock = page.locator('.dock');
  await expect(dock).toBeVisible();
  const c = await dock.evaluate((node) => {
    const s = getComputedStyle(node);
    const p = node.querySelector('p') as HTMLElement;
    return { bg: s.backgroundColor, fg: getComputedStyle(p).color };
  });
  const alpha = Number((c.bg.match(/rgba\([^)]*,\s*([\d.]+)\)/) ?? [, '1'])[1]);
  expect(alpha).toBeGreaterThanOrEqual(0.95);
  // Fond sombre sous un texte clair : pas de voile blanc translucide.
  const lum = (rgb: string): number => {
    const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  expect(Math.abs(lum(c.fg) - lum(c.bg))).toBeGreaterThan(0.5);
});
