import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

// Retest C7 : le brief compte les constats comme le rapport (un contrôle
// réussi n’en est pas un) et accorde « ignoré » au singulier.

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

function finding(checkId: string, status: string, severity: number) {
  return {
    domain: 'performance',
    checkId,
    status,
    severity,
    impact: 2,
    score: status === 'pass' ? 100 : 40,
    measured: {},
    messageKey: `${checkId}.${status}`,
    params: {},
    fixKey: status === 'pass' ? null : checkId,
    effortMinutes: status === 'pass' ? null : 20,
    reason: null,
  };
}

async function openBrief(page: Page): Promise<void> {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem(
      'audigy-auth',
      JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        user: {
          id: '00000000-0000-4000-8000-0000000000a1',
          email: 'gratuit@exemple.fr',
        },
      }),
    );
  });
  await stubSession(page);
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audit: {
          id: AUDIT_ID,
          status: 'done',
          mode: 'passive',
          trigger: 'manual',
          methodVersion: '2026.1',
          engineVersion: '0.15.0',
          globalScore: 72,
          coverage: 0.5,
          createdAt: '2026-10-23T12:00:00.000Z',
          startedAt: '2026-10-23T12:00:01.000Z',
          finishedAt: '2026-10-23T12:30:00.000Z',
          error: null,
          site: {
            id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
            url: 'https://exemple.fr',
            label: 'exemple.fr',
            scope: 'origin',
            hosting: 'other',
          },
        },
        domains: [
          { domain: 'performance', score: 40, coverage: 1, level: 'problem' },
        ],
        findings: [
          finding('performance.lcp', 'fail', 4),
          finding('performance.cls', 'warn', 2),
          finding('performance.cache', 'pass', 1),
        ],
      }),
    });
  });
  await page.goto(`/rapport/${AUDIT_ID}/brief`);
}

test('C7 : un contrôle réussi ne compte pas, « 1 ignoré » au singulier', async ({
  page,
}) => {
  await openBrief(page);
  const stats = page.locator('ul.stats li');
  await expect(stats.nth(0)).toHaveText('2constats détectés', {
    timeout: 15_000,
  });
  await expect(stats.nth(1)).toHaveText('1à corriger');
  await expect(stats.nth(2)).toHaveText('1à vérifier');
  await expect(stats.nth(3)).toHaveText('0ignoré');
  await page
    .locator('label', {
      has: page.locator('input[name="performance.cls"][value="skip"]'),
    })
    .click();
  await expect(stats.nth(0)).toHaveText('2constats détectés');
  await expect(stats.nth(2)).toHaveText('0à vérifier');
  await expect(stats.nth(3)).toHaveText('1ignoré');
  await page
    .locator('label', {
      has: page.locator('input[name="performance.lcp"][value="skip"]'),
    })
    .click();
  await expect(stats.nth(3)).toHaveText('2ignorés');
});
