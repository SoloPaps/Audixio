import { expect, test } from '@playwright/test';
import { stubSiteAccount } from './site-session.js';

// Lot 6, petits défauts relevés au lot 5 (un test par défaut).

const debords = `(() => [...document.querySelectorAll('main *')]
  .filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed';
  })
  .map((el) => el.tagName.toLowerCase() + '.' + [...el.classList].join('.')))()`;

for (const width of [390, 320]) {
  test(`/bienvenue à ${width} px : la lueur décorative reste dans la fenêtre`, async ({
    page,
  }) => {
    await stubSiteAccount(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/bienvenue?theme=light');
    await expect(page.locator('.bv .bv-bg')).toHaveCSS('overflow', 'hidden');
    // Laisse la lueur au bout de son animation (translate + scale).
    await page.waitForTimeout(400);
    expect(await page.evaluate<string[]>(debords)).toEqual([]);
  });
}

test('/historique à 390 px : le journal se lit en cartes, sans débordement', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/historique?theme=light');
  const row = page.locator('.hs tbody tr').first();
  await expect(row.locator('td.c-date time')).toBeVisible();
  await expect(row.locator('td.c-ref')).toHaveAttribute(
    'data-l',
    'N° de rapport',
  );
  const box = await row.evaluate((tr) => {
    const r = (sel: string) => tr.querySelector(sel)?.getBoundingClientRect();
    const date = r('td.c-date');
    const note = r('td.c-note');
    const ref = r('td.c-ref');
    const act = r('td.ta');
    return {
      sameLine: !!date && !!note && Math.abs(date.top - note.top) < 4,
      noteRight: !!note && !!date && note.left > date.left,
      refBelow: !!ref && !!date && ref.top > date.bottom - 1,
      actBelow: !!act && !!ref && act.top > ref.bottom - 1,
    };
  });
  expect(box).toEqual({
    sameLine: true,
    noteRight: true,
    refBelow: true,
    actBelow: true,
  });
  expect(await page.evaluate<string[]>(debords)).toEqual([]);
});

test('/historique à 1440 px : le journal reste un tableau à en-têtes', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/historique?theme=light');
  await expect(page.locator('.hs tbody tr').first()).toHaveCSS(
    'display',
    'table-row',
  );
  await expect(page.locator('.hs thead th').first()).toBeVisible();
});

test('/audit-echoue : « L’audit » n’apparaît qu’une fois dans le titre', async ({
  page,
}) => {
  await page.goto('/audit-echoue');
  await expect(page.locator('h1')).toHaveText('L’audit n’a pas abouti');
  const id = '00000000-0000-4000-8000-0000000000e1';
  await page.evaluate(
    ([key, auditId]) => {
      const payload = {
        audit: {
          id: auditId,
          status: 'failed',
          createdAt: '2026-11-12T10:00:00.000Z',
          finishedAt: '2026-11-12T10:01:00.000Z',
          error: '',
          site: { url: 'https://absent.audigy.test/' },
        },
        findings: [],
        domains: [],
      };
      sessionStorage.setItem(key, JSON.stringify({ [auditId]: payload }));
    },
    ['audixio-guest-audit', id] as const,
  );
  await page.goto(`/audit-echoue?id=${id}`);
  await expect(page.locator('h1')).toHaveText(
    'L’audit de absent.audigy.test n’a pas abouti',
  );
  const text = await page.locator('h1').evaluate((h) => h.textContent ?? '');
  expect(text.match(/L’audit/g)?.length).toBe(1);
});
