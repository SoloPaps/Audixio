import { expect, type Page, test } from '@playwright/test';

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

async function openHistory(
  page: Page,
  scores: readonly [number, number],
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
      const score = raw.includes(SECOND) ? scores[1] : scores[0];
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
}

test('un site réel redessine la courbe d’historique', async ({ page }) => {
  await openHistory(page, [72, 88]);
  const values = page.locator('text.val');
  await expect(values.nth(0)).toHaveText('72', { timeout: 15_000 });
  await expect(values.nth(1)).toHaveText('88');
  const points = await page.locator('polyline.ln').getAttribute('points');
  expect(points).toContain('70.0,237.0');
  expect(points).toContain('890.0,53.0');
  expect(points).not.toContain('168.0');
  expect(points).not.toBe(DEMO);
  // Bug #93 : la moyenne suit les audits réels (72 et 88), pas 80,6.
  const average = page.locator('.legend .avg [data-count]');
  await page.waitForTimeout(2_500);
  await expect(average).toHaveText('80,0');
  // Bug #5 : la légende compte les audits affichés, pas « 6 audits ».
  await expect(page.locator('.legend > span').first()).toHaveText(
    'Note globale pondérée (2 audits)',
  );
});

test('« Historique et tendances » ouvre l’historique du site de la carte', async ({
  page,
}) => {
  const BON = '00000000-0000-4000-8000-0000000000b1';
  const EXAMPLE = '00000000-0000-4000-8000-0000000000e1';
  const rows = [
    {
      id: BON,
      url: 'https://bon.audigy.test',
      label: 'bon.audigy.test',
      host: 'bon.audigy.test',
      owner_id: session.user.id,
    },
    {
      id: EXAMPLE,
      url: 'https://example.com',
      label: 'example.com',
      host: 'example.com',
      owner_id: session.user.id,
    },
  ];
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const url = new URL(request.url());
    if (url.pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: url.pathname.includes('/rest/v1/') ? '[]' : '{}',
    });
  });
  await page.goto('/sites?theme=light');
  await expect(page.getByText('bon.audigy.test').first()).toBeVisible({
    timeout: 15_000,
  });
  const links = page.locator('main a[href^="/historique"]');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', `/historique?site=${BON}`);
  await expect(links.nth(1)).toHaveAttribute(
    'href',
    `/historique?site=${EXAMPLE}`,
  );
});

test('la note sous le graphique décrit l’axe réellement affiché (bug #4)', async ({
  page,
}) => {
  await openHistory(page, [55, 88]);
  await expect(page.locator('text.val').nth(0)).toHaveText('55', {
    timeout: 15_000,
  });
  const ticks = page.locator('.grid text');
  const low = await ticks.first().textContent();
  const high = await ticks.last().textContent();
  expect(low).not.toBe('70');
  await expect(page.locator('#rng-note')).toHaveText(
    `Axe vertical resserré entre ${low} et ${high} pour rendre les écarts lisibles.`,
  );
});
