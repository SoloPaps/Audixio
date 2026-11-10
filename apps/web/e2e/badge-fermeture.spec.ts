import { expect, type Page, test } from '@playwright/test';

const AUDIT = '1dfeaad0-f09c-4405-a5eb-eed8fe1235b1';

function payload(): unknown {
  return {
    audit: {
      id: AUDIT,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 74,
      siteVerified: false,
      coverage: 0.6,
      createdAt: '2026-11-05T10:00:00.000Z',
      startedAt: '2026-11-05T10:00:01.000Z',
      finishedAt: '2026-11-05T10:03:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 70, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 80, coverage: 1, level: 'good' },
    ],
    findings: [],
  };
}

async function openBadge(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    sessionStorage.setItem('audixio-guest-audit', JSON.stringify(value));
  }, payload());
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto(`/badge?id=${AUDIT}&theme=light`);
}

test('M7 : à 330 px, le bouton fermer reste cliquable au-dessus du kicker', async ({
  page,
}) => {
  await openBadge(page);
  const close = page.locator('a.x');
  await expect(close).toBeVisible({ timeout: 15_000 });
  const hit = await page.evaluate(`(() => {
    const el = document.querySelector('a.x');
    if (!el) return 'missing';
    const box = el.getBoundingClientRect();
    const node = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return node && node.closest('a.x')
      ? 'close'
      : (node && (node.className || node.tagName)) || 'none';
  })()`);
  expect(hit).toBe('close');
});
