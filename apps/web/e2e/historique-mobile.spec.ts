import { expect, type Page, test } from '@playwright/test';

// Retest C5 et C11 : graphique d’historique d’un site avec N audits.
const SITE = '00000000-0000-4000-8000-0000000000bd';
const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'ada@exemple.fr' },
};

const DAYS = [
  '2026-10-15',
  '2026-10-19',
  '2026-10-23',
  '2026-10-27',
  '2026-10-31',
  '2026-11-04',
];

function auditId(index: number): string {
  return `00000000-0000-4000-8000-0000000001${String(index).padStart(2, '0')}`;
}

async function openHistory(page: Page, scores: readonly number[]) {
  await page.addInitScript((value) => {
    globalThis.localStorage.setItem('audigy-auth', JSON.stringify(value));
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
          created_at: '2026-10-01T00:00:00.000Z',
        },
      }),
    });
  });
  const audits = scores.map((_, index) => ({
    id: auditId(index),
    status: 'done',
    created_at: `${DAYS[index]}T09:13:00.000Z`,
    finished_at: `${DAYS[index]}T09:15:00.000Z`,
  }));
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const headers = {
      'access-control-allow-origin':
        request.headers().origin ?? 'http://127.0.0.1:4321',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'content-type': 'application/json',
    };
    if (request.method().toLowerCase() === 'options') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
    if (url.includes('/rest/v1/audits')) return json(audits);
    if (url.includes('/rest/v1/sites'))
      return json([{ id: SITE, host: 'mobile.audigy.test', hosting: 'other' }]);
    if (url.includes('/rest/v1/profiles')) return json({ plan: 'free' });
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const index = audits.findIndex((audit) => raw.includes(audit.id));
      return json({ score_global: scores[Math.max(index, 0)] ?? null });
    }
    if (url.includes('domain_scores') || url.includes('findings'))
      return json([]);
    await route.fulfill({ status: 200, headers, body: 'null' });
  });
  await page.goto(`/historique?site=${SITE}&theme=light`);
}

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

async function textBoxes(page: Page, selector: string): Promise<Box[]> {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
}

for (const width of [330, 390]) {
  test(`${width} px : courbe lisible, environ 180 px de haut (retest C11)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openHistory(page, [52, 58, 61, 66, 70, 74]);
    const svg = page.locator('#chart svg').first();
    await expect(page.locator('text.val').first()).toHaveText('52', {
      timeout: 15_000,
    });
    await expect(svg).toHaveClass(/narrow/);
    const box = await svg.boundingBox();
    if (!box) throw new Error('graphique absent');
    expect(box.height).toBeGreaterThanOrEqual(170);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const labels = await textBoxes(page, '#chart svg g.xl text');
    expect(labels.length).toBeGreaterThanOrEqual(2);
    const values = await textBoxes(page, '#chart svg text.val');
    for (const group of [labels, values]) {
      for (let i = 1; i < group.length; i += 1) {
        const previous = group[i - 1];
        const current = group[i];
        if (!previous || !current) continue;
        expect(overlaps(previous, current)).toBe(false);
      }
    }
    // Pas de défilement horizontal interne (#150).
    const scroll = await page
      .locator('#chart')
      .evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(scroll).toBeLessThanOrEqual(0);
  });
}

test('bureau : la courbe garde le cadre large (retest C11)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openHistory(page, [52, 58, 61]);
  await expect(page.locator('text.val').first()).toHaveText('52', {
    timeout: 15_000,
  });
  const svg = page.locator('#chart svg').first();
  await expect(svg).toHaveAttribute('viewBox', '0 0 960 300');
  await expect(svg).not.toHaveClass(/narrow/);
  await expect(page.locator('#chart svg g.xl text')).toHaveCount(3);
});

test('un seul audit : l’axe et le titre donnent la date, pas l’heure (retest C5)', async ({
  page,
}) => {
  await openHistory(page, [72]);
  await expect(page.locator('text.val').first()).toHaveText('72', {
    timeout: 15_000,
  });
  const label = page.locator('#chart svg g.xl text');
  await expect(label).toHaveCount(1);
  await expect(label).toHaveText('15 oct.');
  await expect(page.locator('#ch-d')).toHaveText(
    'Note globale pondérée, 15 oct. : 72.',
  );
});

test('plusieurs audits : le titre se lit « du … au … » (retest C5)', async ({
  page,
}) => {
  await openHistory(page, [52, 58, 61]);
  await expect(page.locator('text.val').first()).toHaveText('52', {
    timeout: 15_000,
  });
  await expect(page.locator('#ch-d')).toHaveText(
    'Note globale pondérée du 15 oct. au 23 oct. : 52, 58, 61.',
  );
});
