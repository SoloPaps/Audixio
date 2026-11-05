import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

// Retest C15 : un domaine sans constat dit « Rien à signaler dans ce domaine »
// au lieu d’un texte de problème générique.

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

async function openDomain(page: Page, domain: string): Promise<void> {
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
          { domain: 'performance', score: 60, coverage: 1, level: 'improve' },
          { domain: 'accessibilite', score: 64, coverage: 1, level: 'improve' },
        ],
        findings: [
          finding('performance.lcp', 'fail', 4),
          finding('performance.cls', 'warn', 2),
          finding('performance.cache', 'pass', 1),
        ],
      }),
    });
  });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=${domain}`);
}

test('C15 : domaine sans constat, « Rien à signaler dans ce domaine »', async ({
  page,
}) => {
  await openDomain(page, 'accessibilite');
  await expect(page.locator('.dh .lede')).toHaveText(
    'Rien à signaler dans ce domaine.',
    { timeout: 15_000 },
  );
  await expect(page.locator('#list li')).toHaveCount(0);
  await expect(page.locator('p.empty')).toHaveText(
    'Rien à signaler dans ce domaine.',
  );
});

test('C15 : un domaine avec constats garde son chapeau', async ({ page }) => {
  await openDomain(page, 'performance');
  await expect(page.locator('#list li').first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.dh .lede')).not.toHaveText(
    'Rien à signaler dans ce domaine.',
  );
});
