import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openHistory } from './h-history.js';

for (const theme of ['light', 'dark'] as const) {
  test(`U5 : gratuit, dernier audit seul et appel Pro (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 330, height: 800 });
    await openHistory(page, [72, 88], theme);
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody')).toContainText('88');
    await expect(page.locator('table tbody')).not.toContainText('72');
    const upsell = page.locator('#history-upgrade');
    await expect(upsell).toBeVisible();
    await expect(upsell).toContainText('Dernier audit');
    await expect(upsell.locator('a')).toHaveAttribute('href', '/pro');
    const bounds = (await page.evaluate(`(() => {
      const card = document.querySelector('#history-upgrade').getBoundingClientRect();
      const cta = document.querySelector('#history-upgrade a').getBoundingClientRect();
      return { card: card.right, cta: cta.right, left: cta.left, scroll: document.documentElement.scrollWidth };
    })()`)) as { card: number; cta: number; left: number; scroll: number };
    expect(bounds.card).toBeLessThanOrEqual(330);
    expect(bounds.cta).toBeLessThanOrEqual(330);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.scroll).toBeLessThanOrEqual(330);

    await expect(page.locator('#chartc')).toBeHidden();
    for (const fmt of ['csv', 'pdf']) {
      await page.locator('#hexpb').click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator(`[data-hfmt="${fmt}"]`).click(),
      ]);
      const bytes = await readFile(await download.path());
      const text = bytes.toString(fmt === 'pdf' ? 'latin1' : 'utf8');
      if (fmt === 'csv') {
        expect(text.trim().split(/\r?\n/u)).toHaveLength(2);
        expect(text).toContain('88');
        expect(text).not.toContain('72');
      } else {
        expect(text).toContain('(88)');
        expect(text).not.toContain('(72)');
      }
      await expect(page.locator('#hexpb')).toBeEnabled();
    }
  });
}

test('U5 : Pro garde toute la courbe et les audits ; aucune promotion', async ({
  page,
}) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(1)).toHaveText('88');
  await expect(page.locator('table tbody tr')).toHaveCount(2);
  await expect(page.locator('#chartc')).toBeVisible();
  await expect(page.locator('#history-upgrade')).toBeHidden();
});

test('U5 : appel Pro EN, pas de français et aucune fuite sur chargement direct', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  await page.goto(`${page.url()}&lang=en`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  const upsell = page.locator('#history-upgrade');
  await expect(upsell).toContainText('Latest audit');
  await expect(upsell).toContainText('Unlock full history');
  await expect(upsell).not.toContainText('Dernier');
});

test('U5 : profil indisponible, profondeur gratuite par défaut et aucun ancien score demandé', async ({
  page,
}) => {
  const scored: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('read_rapport_apercu'))
      scored.push(request.postData() ?? '');
  });
  await openHistory(page, [72, 88]);
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  expect(
    scored.some((body) =>
      body.includes('00000000-0000-4000-8000-0000000000c1'),
    ),
  ).toBe(false);
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill({
      status: 403,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
      contentType: 'application/json',
      body: '{}',
    }),
  );
  await page.reload();
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await expect(page.locator('#history-upgrade')).toBeVisible();
  await expect(page.locator('#chartc')).toBeHidden();
});

test('U5 : dernier audit en échec, jamais de repli sur un ancien audit ni sur la maquette', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await page.route('**/rest/v1/audits**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-4000-8000-0000000000c2',
          site_id: '00000000-0000-4000-8000-0000000000bb',
          status: 'failed',
          created_at: '2026-05-03T10:00:00Z',
          finished_at: '2026-05-03T10:00:01Z',
        },
      ]),
    }),
  );
  await page.reload();
  await expect(page.locator('main h1')).toHaveText('bon.audigy.test');
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await expect(page.locator('table tbody')).not.toContainText('72');
  await expect(page.locator('table tbody a')).toHaveAttribute('href', /0c2$/u);
  await expect(page.locator('#chartc')).toBeHidden();
});
