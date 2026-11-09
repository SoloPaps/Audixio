import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './en-session.js';

// QA Mo 05/11, thème rapport-prompt : B8 et prompt IA lisible.

const AUDIT_ID = '00000000-0000-4000-8000-0000000000b4';

function finding(
  domain: string,
  checkId: string,
  status: string,
  severity: number,
  impact: number,
  messageKey: string,
): unknown {
  return {
    domain,
    checkId,
    status,
    severity,
    impact,
    score: status === 'pass' ? 100 : 0,
    measured: {},
    messageKey,
    params: {},
    fixKey: checkId,
    effortMinutes: 10,
    reason: null,
  };
}

async function verifiedAudit(page: Page): Promise<void> {
  const body = {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 74,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-26T10:00:00.000Z',
      startedAt: '2026-10-26T10:00:01.000Z',
      finishedAt: '2026-10-26T10:05:00.000Z',
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
      { domain: 'performance', score: 55, coverage: 1, level: 'improve' },
      { domain: 'securite', score: 70, coverage: 1, level: 'improve' },
    ],
    findings: [
      finding(
        'performance',
        'performance.lcp',
        'fail',
        4,
        3,
        'performance.lcp.fail',
      ),
      finding(
        'securite',
        'securite.frames',
        'fail',
        3,
        2,
        'securite.frames.fail',
      ),
      finding(
        'securite',
        'securite.hsts',
        'warn',
        2,
        1,
        'securite.hsts.warn_short',
      ),
    ],
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

test('B8 (bug_c3b0c4d3) : un constat Sécurité n’affiche pas de gain en secondes', async ({
  page,
}) => {
  await verifiedAudit(page);
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=securite&theme=light`);
  const impacts = page.locator('.cst .imp');
  await expect(impacts).toHaveCount(2, { timeout: 15_000 });
  await expect(impacts).toHaveText(['Impact moyen', 'Impact faible']);
  for (const text of await impacts.allTextContents()) {
    expect(text).not.toMatch(/\d\s*s\b/);
  }
  await expect(page.locator('.gain')).toHaveCount(0);

  // La vitesse garde son estimation en secondes.
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance&theme=light`);
  await expect(page.locator('.cst .imp').first()).toHaveText(/Impact ≈ 1,1 s/, {
    timeout: 15_000,
  });
  await expect(page.locator('.gain')).toBeVisible();
});
