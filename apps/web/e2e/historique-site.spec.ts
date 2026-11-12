// U5 : les assertions multi-audits/courbes ci-dessous utilisent désormais Pro.
import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

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
  host = 'bon.audigy.test',
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
    const origin = request.headers().origin ?? ORIGIN;
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
        body: JSON.stringify([{ id: SITE, host, hosting: 'other' }]),
      });
      return;
    }
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'pro' }),
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

test('330 px : le nom de domaine ne se coupe qu’après un point', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  const host = 'gratuit.audixioexemple.test';
  await openHistory(page, [72, 88], 'light', host);
  // Lot 4 : l’historique est une section de /sites/:host, dont le titre est l’hôte.
  const title = page.locator('h1');
  await expect(title).toHaveText(host, { timeout: 15_000 });
  const breaks = await title.evaluate((node) => {
    const view = globalThis as unknown as {
      document: {
        createRange: () => {
          setStart: (n: unknown, o: number) => void;
          setEnd: (n: unknown, o: number) => void;
          getBoundingClientRect: () => { top: number };
        };
        createTreeWalker: (
          n: unknown,
          w: number,
        ) => { nextNode: () => { data: string } | null };
      };
    };
    const walker = view.document.createTreeWalker(node, 4);
    const chars: { c: string; top: number }[] = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      for (let i = 0; i < text.data.length; i += 1) {
        const range = view.document.createRange();
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        chars.push({
          c: text.data[i] ?? '',
          top: Math.round(range.getBoundingClientRect().top),
        });
      }
    }
    const before: string[] = [];
    for (let i = 1; i < chars.length; i += 1) {
      const prev = chars[i - 1];
      const cur = chars[i];
      if (prev && cur && cur.top > prev.top + 4) before.push(prev.c);
    }
    return before;
  });
  for (const c of breaks) expect(c).toBe('.');
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
  // Lot 4 : la section #historique de la page du site (R11).
  const links = page.locator('main a[href$="#historique"]');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute(
    'href',
    '/sites/bon.audigy.test#historique',
  );
  await expect(links.nth(1)).toHaveAttribute(
    'href',
    '/sites/example.com#historique',
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
  await page.addInitScript(() => {
    localStorage.setItem('audigy-theme', 'dark');
  });
  await openHistory(page, [72, 88], 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
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
  await page.addInitScript(() => {
    localStorage.setItem('audigy-theme', 'dark');
  });
  await openHistory(page, [72, 88], 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
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

test('B2 sombre : le bouton de période actif reste visible', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    localStorage.setItem('audigy-theme', 'dark');
  });
  await openHistory(page, [72, 88], 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(600);
  await page.locator('.seg button[aria-pressed="false"]').first().click();
  await page.waitForTimeout(600);
  const active = page.locator('.seg button[aria-pressed="true"]');
  const inactive = page.locator('.seg button[aria-pressed="false"]').first();
  await expect(active).toBeVisible();
  await page.waitForTimeout(600);
  const styles = await page.evaluate(() => {
    type Box = { left: number; right: number };
    type Node = { getBoundingClientRect: () => Box };
    const view = globalThis as unknown as {
      document: { querySelector: (s: string) => Node | null };
      getComputedStyle: (n: Node) => { backgroundColor: string; color: string };
    };
    const getComputedStyle = view.getComputedStyle;
    const active = view.document.querySelector(
      '.seg button[aria-pressed="true"]',
    );
    const inactive = view.document.querySelector(
      '.seg button[aria-pressed="false"]',
    );
    const ind = view.document.querySelector('.seg .ind');
    const rect = active?.getBoundingClientRect();
    const ir = ind?.getBoundingClientRect();
    const rgb = (v: string) => {
      const m = v.match(/[\d.]+/g)?.map(Number) ?? [];
      return { r: m[0] ?? 0, g: m[1] ?? 0, b: m[2] ?? 0 };
    };
    const lum = (c: { r: number; g: number; b: number }): number => {
      const f = (x: number): number => {
        const s = x / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const bg = ind ? getComputedStyle(ind).backgroundColor : '';
    const fg = active ? getComputedStyle(active).color : '';
    const l1 = lum(rgb(bg));
    const l2 = lum(rgb(fg));
    return {
      bg,
      fg,
      contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      covered:
        !!rect &&
        !!ir &&
        ir.left <= rect.left + 2 &&
        ir.right >= rect.right - 2,
      inactiveBg: inactive ? getComputedStyle(inactive).backgroundColor : '',
      activeOwnBg: active ? getComputedStyle(active).backgroundColor : '',
    };
  });
  // B2 : le fond actif doit couvrir le libellé et offrir un contraste lisible.
  expect(styles.covered).toBe(true);
  // Le bouton lui-même ne doit pas peindre un fond opaque par-dessus l’indicateur.
  expect(styles.activeOwnBg).toBe('rgba(0, 0, 0, 0)');
  expect(styles.bg).not.toBe(styles.inactiveBg);
  expect(styles.contrast).toBeGreaterThanOrEqual(4.5);
});

test('B6 : le titre accessible du graphique reprend les vraies notes', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  const desc = page.locator('#ch-d');
  await expect(desc).toContainText('72, 88', { timeout: 15_000 });
  await expect(desc).not.toContainText('décembre 2025');
  await expect(desc).not.toContainText('78, 79');
});
