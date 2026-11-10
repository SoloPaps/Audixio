import { expect, type Page, test } from '@playwright/test';

const SITE = '00000000-0000-4000-8000-0000000000be';
const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'ada@exemple.fr' },
};
const DAYS = ['2026-10-15', '2026-10-26', '2026-11-04'];

function auditId(index: number): string {
  return `00000000-0000-4000-8000-0000000002${String(index).padStart(2, '0')}`;
}

async function openEnglishHistory(page: Page): Promise<void> {
  const pack = await (await page.request.get('/dictionnaire-en.json')).text();
  await page.addInitScript(
    ([auth, dictionary]) => {
      const storage = (
        globalThis as unknown as {
          localStorage: { setItem: (key: string, item: string) => void };
        }
      ).localStorage;
      storage.setItem('audigy-auth', JSON.stringify(auth));
      storage.setItem('audigy-en', dictionary);
      storage.setItem('audigy-locale', 'en');
    },
    [session, pack] as const,
  );
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
  const scores = [64, 78, 86];
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
      return json([{ id: SITE, host: 'bon.audigy.test', hosting: 'other' }]);
    if (url.includes('/rest/v1/profiles')) return json({ plan: 'pro' });
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const index = audits.findIndex((audit) => raw.includes(audit.id));
      return json({ score_global: scores[Math.max(index, 0)] ?? null });
    }
    if (url.includes('domain_scores') || url.includes('findings'))
      return json([]);
    await route.fulfill({ status: 200, headers, body: 'null' });
  });
  await page.setViewportSize({ width: 330, height: 800 });
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

test('B2 : à 330 px EN, le libellé du seuil B ne recouvre pas le 78', async ({
  page,
}) => {
  await openEnglishHistory(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#chart .thr text')).toHaveText('B (80)', {
    timeout: 15_000,
  });
  await expect(page.locator('text.val')).toHaveText(['64', '78', '86']);
  const threshold = await page.locator('#chart .thr text').boundingBox();
  const values = await page.locator('text.val').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        text: node.textContent,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
  expect(threshold).not.toBeNull();
  if (!threshold) return;
  for (const value of values) {
    expect(
      overlaps(threshold, value),
      `${value.text} chevauche le seuil (${JSON.stringify({ threshold, value })})`,
    ).toBe(false);
  }
});
