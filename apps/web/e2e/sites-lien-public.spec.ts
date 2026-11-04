import { expect, type Page, test } from '@playwright/test';

const USER = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: USER, email: 'pro@exemple.fr' },
};

const SITE = '00000000-0000-4000-8000-0000000000cc';
const patches: unknown[] = [];

async function openSites(
  page: Page,
  options: { theme?: 'light' | 'dark'; published?: boolean } = {},
): Promise<void> {
  patches.length = 0;
  let row = {
    id: SITE,
    url: 'https://gratuit.audigy.test',
    label: 'gratuit.audigy.test',
    host: 'gratuit.audigy.test',
    is_public: options.published === true,
    public_slug: (options.published ? 'gratuit-audigy-01' : null) as
      | string
      | null,
    expose_security: false,
  };
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
    if (url.includes('/rest/v1/sites') && request.method() === 'PATCH') {
      const patch = request.postDataJSON() as Partial<typeof row>;
      patches.push(patch);
      row = { ...row, ...patch };
      await route.fulfill({ status: 200, headers, body: JSON.stringify(row) });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([row]),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
  await page.goto(`/sites?theme=${options.theme ?? 'light'}`);
}

test('Créer un lien de partage publie le score du site (bug #111)', async ({
  page,
}) => {
  await openSites(page);
  const create = page.getByRole('button', { name: 'Créer un lien de partage' });
  await expect(create).toBeVisible({ timeout: 15_000 });
  await create.click();
  await expect.poll(() => patches.length).toBe(1);
  expect(patches[0]).toMatchObject({ is_public: true });
  await expect(
    page.getByRole('button', { name: 'Copier le lien' }),
  ).toBeVisible();
});

test('Dépublier remet le site en privé (bug #111)', async ({ page }) => {
  await openSites(page, { published: true });
  const unpublish = page.getByRole('button', { name: 'Dépublier' });
  await expect(unpublish).toBeVisible({ timeout: 15_000 });
  await unpublish.click();
  await expect.poll(() => patches.length).toBe(1);
  expect(patches[0]).toMatchObject({ is_public: false });
  await expect(
    page.getByRole('button', { name: 'Créer un lien de partage' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dépublier' })).toHaveCount(0);
});

test('Dépublier est traduit en anglais (bug #111)', async ({ page }) => {
  await openSites(page, { published: true });
  await expect(page.getByRole('button', { name: 'Dépublier' })).toBeVisible({
    timeout: 15_000,
  });
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible({
    timeout: 15_000,
  });
});

test('Dépublier reste lisible en sombre (bug #111)', async ({ page }) => {
  await openSites(page, { theme: 'dark', published: true });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const unpublish = page.getByRole('button', { name: 'Dépublier' });
  await expect(unpublish).toBeVisible({ timeout: 15_000 });
  const ratio = await page.evaluate<number>(`(() => {
    const el = document.querySelector('[data-unpublish]');
    const rgb = (v) => v.match(/[\\d.]+/g).map(Number);
    const lum = (c) => {
      const [r, g, b] = c.slice(0, 3).map((x) => {
        const s = x / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let node = el;
    let bg = [255, 255, 255];
    while (node) {
      const c = rgb(getComputedStyle(node).backgroundColor);
      if (c.length < 4 || c[3] > 0.5) { bg = c; break; }
      node = node.parentElement;
    }
    const fg = lum(rgb(getComputedStyle(el).color));
    const back = lum(bg);
    return (Math.max(fg, back) + 0.05) / (Math.min(fg, back) + 0.05);
  })()`);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
