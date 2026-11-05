import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

// U3 : sur /domaine en anglais à 330 px, « Moderate » ne déborde pas de
// sa marche de l’échelle des notes.

const AUDIT_ID = '00000000-0000-4000-8000-0000000000b5';

async function verifiedReport(page: Page): Promise<void> {
  const body = {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 86,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      'performance',
      'accessibilite',
      'seo',
      'ecoconception',
      'rgpd',
      'qualite',
      'mobile',
      'securite',
    ].map((domain) => ({ domain, score: 86, coverage: 1, level: 'improve' })),
    findings: [],
  };
  await stubSession(page, 'pro');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

// Largeur du texte de chaque marche comparée à sa boîte de contenu.
const MEASURE = `(() => [...document.querySelectorAll('.ladder li')].map((li) => {
  const range = document.createRange();
  range.selectNodeContents(li);
  const text = [...range.getClientRects()].filter((r) => r.width > 0);
  const box = li.getBoundingClientRect();
  const style = getComputedStyle(li);
  const left = box.left + parseFloat(style.borderLeftWidth);
  const right = box.right - parseFloat(style.borderRightWidth);
  return {
    label: li.textContent.trim(),
    left: Math.min(...text.map((r) => r.left)) - left,
    right: right - Math.max(...text.map((r) => r.right)),
    scroll: li.scrollWidth - li.clientWidth,
    lines: (() => {
      const label = document.createRange();
      const node = [...li.childNodes].filter((n) => n.nodeType === 3).pop();
      if (!node) return 0;
      label.selectNodeContents(node);
      return new Set([...label.getClientRects()].map((r) => Math.round(r.top))).size;
    })(),
  };
}))()`;

for (const [theme, width] of [
  ['light', 330],
  ['dark', 330],
  ['light', 320],
  ['light', 375],
] as const) {
  test(`U3 : /domaine EN ${width} px (${theme}), aucune marche de l’échelle ne déborde`, async ({
    page,
  }) => {
    await verifiedReport(page);
    // Bascule EN au sélecteur (large), puis passage à 330 px.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      `/domaine?id=${AUDIT_ID}&domaine=performance&theme=${theme}`,
    );
    await toEnglish(page);
    await page.setViewportSize({ width, height: 800 });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.waitForLoadState('networkidle');
    const steps = page.locator('.ladder li');
    await expect(steps).toHaveCount(4, { timeout: 15_000 });
    await expect(page.locator('.ladder')).toContainText('Moderate');
    const rows = (await page.evaluate(MEASURE)) as {
      label: string;
      left: number;
      right: number;
      scroll: number;
      lines: number;
    }[];
    for (const row of rows) {
      expect(row.left, row.label).toBeGreaterThanOrEqual(0);
      expect(row.right, row.label).toBeGreaterThanOrEqual(0);
      expect(row.scroll, row.label).toBeLessThanOrEqual(0);
      // Le libellé tient sur une ligne : pas de « Moder / ate ».
      expect(row.lines, row.label).toBe(1);
    }
  });
}
