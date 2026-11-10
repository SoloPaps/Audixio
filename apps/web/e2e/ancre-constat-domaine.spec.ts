import { expect, type Page, test } from '@playwright/test';

const AUDIT = '00000000-0000-4000-8000-00000000b601';

function finding(
  domain: string,
  checkId: string,
  messageKey: string,
): Record<string, unknown> {
  return {
    domain,
    checkId,
    status: 'fail',
    severity: 4,
    impact: 3,
    score: 0,
    measured: {},
    messageKey,
    params: {},
    fixKey: checkId,
    effortMinutes: 15,
    reason: null,
  };
}

function payload(): unknown {
  return {
    audit: {
      id: AUDIT,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 64,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-00000000b602',
        url: 'https://mauvais.audigy.test',
        label: 'mauvais.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 80, coverage: 1, level: 'good' },
      { domain: 'qualite', score: 40, coverage: 1, level: 'problem' },
    ],
    findings: [
      finding('qualite', 'qualite.liens', 'qualite.liens.fail_internal_one'),
    ],
  };
}

async function storeGuest(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    (value) => {
      const storage = (
        globalThis as unknown as {
          sessionStorage: { setItem: (key: string, item: string) => void };
        }
      ).sessionStorage;
      storage.setItem(
        'audixio-guest-audit',
        JSON.stringify({ [value.audit.id]: value }),
      );
    },
    payload() as { audit: { id: string } },
  );
}

test('B6 : l’ancre #finding-… fait défiler jusqu’au constat', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await storeGuest(page);
  await page.goto(
    `/domaine?id=${AUDIT}&domaine=qualite#finding-qualite.liens-0`,
  );
  const target = page.locator('#finding-qualite\\.liens-0');
  await expect(target).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      if (!box) return false;
      return box.y + box.height > 0 && box.y < 800;
    })
    .toBe(true);
  expect(await page.evaluate<number>('window.scrollY')).toBeGreaterThan(200);
});
