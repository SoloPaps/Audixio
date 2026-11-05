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
  scores: readonly [number | null, number | null] | readonly [number],
  theme: 'light' | 'dark' = 'light',
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
        body: JSON.stringify(
          [
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
          ].slice(0, scores.length),
        ),
      });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([
          { id: SITE, host: 'bon.audigy.test', hosting: 'other' },
        ]),
      });
      return;
    }
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const score = raw.includes(SECOND) ? (scores[1] ?? null) : scores[0];
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

  await page.goto(`/historique?site=${SITE}&theme=${theme}`);
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

test('un seul audit : ni tendance « +6 pts » ni « 6 audits »', async ({
  page,
}) => {
  await openHistory(page, [72]);
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  await expect(page.locator('.legend > span').first()).toHaveText(
    'Note globale pondérée (1 audit)',
  );
  await expect(page.locator('.ch-h .badge')).toBeHidden();
});

test('deux audits : la tendance affiche l’écart réel', async ({ page }) => {
  await openHistory(page, [72, 88]);
  await expect(page.locator('text.val').nth(1)).toHaveText('88', {
    timeout: 15_000,
  });
  await expect(page.locator('.ch-h .badge')).toHaveText('+16 pts');
});

test('filtre « 1 an » : la moyenne ne dit plus « sur 6 mois »', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  const avg = page.locator('.legend .avg');
  await page.getByRole('button', { name: '1 an' }).click();
  await expect(avg).toContainText('Moyenne sur 1 an');
  await page.getByRole('button', { name: 'Tout' }).click();
  await expect(avg).toContainText('Moyenne sur toute la période');
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

test('sans mesure, la synthèse ne décerne pas « B · Bon » (bug #130)', async ({
  page,
}) => {
  await openHistory(page, [null, null]);
  await expect(page.locator('.trend > span')).toHaveText(
    'Pas encore de mesure.',
    { timeout: 15_000 },
  );
  await expect(page.locator('.sum-top strong')).toHaveText(
    'Rang Pas encore de note',
  );
  await expect(page.locator('.sum-top .glass')).toHaveText('–');
});

test('en thème sombre, les libellés du graphique sont lisibles (bug #14)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openHistory(page, [72, 88], 'dark');
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  const ratios = await page.evaluate(() => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
    type El = { parentElement: El | null; textContent: string | null };
    const view = globalThis as unknown as {
      document: {
        querySelectorAll: (s: string) => Iterable<El>;
      };
      getComputedStyle: (n: El) => { fill: string; backgroundColor: string };
    };
    const rgb = (value: string): number[] =>
      (value.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]): number => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    const low: string[] = [];
    for (const node of view.document.querySelectorAll('.chart text')) {
      let cur: El | null = node;
      let back = [255, 255, 255];
      while (cur) {
        const c = rgb(view.getComputedStyle(cur).backgroundColor);
        if (c.length >= 3 && (c[3] ?? 1) > 0.5) {
          back = c;
          break;
        }
        cur = cur.parentElement;
      }
      const a = lum(rgb(view.getComputedStyle(node).fill));
      const b = lum(back);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5) low.push(`${node.textContent} ${ratio.toFixed(2)}`);
    }
    return low;
  });
  expect(ratios).toEqual([]);
});

test('en thème sombre, le journal ne dessine pas un rectangle par cellule (bug #85)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await openHistory(page, [72, 88], 'dark');
  await expect(page.locator('text.val').nth(0)).toHaveText('72', {
    timeout: 15_000,
  });
  const boxed = await page.evaluate(() => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
    type El = { parentElement: El | null; textContent: string | null };
    const view = globalThis as unknown as {
      document: { querySelectorAll: (s: string) => Iterable<El> };
      getComputedStyle: (n: El) => { backgroundColor: string };
    };
    const out: string[] = [];
    for (const cell of view.document.querySelectorAll('table td, table th')) {
      const own = view.getComputedStyle(cell).backgroundColor;
      const row = cell.parentElement
        ? view.getComputedStyle(cell.parentElement).backgroundColor
        : '';
      if (own !== 'rgba(0, 0, 0, 0)' && own !== row) {
        out.push((cell.textContent ?? '').trim().slice(0, 20));
      }
    }
    return out;
  });
  expect(boxed).toEqual([]);
});
