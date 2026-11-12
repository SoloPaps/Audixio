import { expect, type Page, test } from '@playwright/test';

const AUDIT = '00000000-0000-4000-8000-00000000c301';

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
        id: '00000000-0000-4000-8000-00000000c302',
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

// STRUCTURE.md §4 : statut 301 et Location, un cas par ligne du lot 3.
const MOVED: [string, string, string][] = [
  ['R1', `/rapport?id=${AUDIT}`, `/rapport/${AUDIT}`],
  ['R2', `/rapport?id=${AUDIT}&domaine=seo`, `/rapport/${AUDIT}/domaines/seo`],
  ['R3', `/rapport?id=${AUDIT}&check=x`, `/rapport/${AUDIT}/constats/x`],
  [
    'R4',
    `/domaine?id=${AUDIT}&domaine=qualite`,
    `/rapport/${AUDIT}/domaines/qualite`,
  ],
  ['R5', `/domaine?id=${AUDIT}`, `/rapport/${AUDIT}/domaines`],
  ['R6', `/constat?id=${AUDIT}&check=y`, `/rapport/${AUDIT}/constats/y`],
  ['R7', `/constat?id=${AUDIT}`, `/rapport/${AUDIT}/constats`],
  ['R8', `/plan?id=${AUDIT}`, `/rapport/${AUDIT}/plan`],
  ['R9', `/brief?id=${AUDIT}`, `/rapport/${AUDIT}/brief`],
  ['R10', `/rapport/imprimer?id=${AUDIT}`, `/rapport/${AUDIT}/imprimer`],
  ['R13', `/badge?id=${AUDIT}`, `/rapport/${AUDIT}?partager=badge`],
];

for (const [code, from, to] of MOVED) {
  test(`${code} : ${from} renvoie en 301 vers ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(to);
  });
}

for (const path of [
  '/passer-pro',
  '/progression?site=a',
  '/partage/abc',
  '/score/exemple',
]) {
  test(`R14, R16, R17 : ${path} n’est pas renvoyée en 301`, async ({
    request,
  }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).not.toBe(301);
  });
}

test('les onglets mènent aux domaines puis aux constats', async ({ page }) => {
  await storeGuest(page);
  await page.goto(`/rapport/${AUDIT}`);
  const tabs = page.getByRole('navigation', { name: 'Sections du rapport' });
  await expect(tabs.getByRole('link', { name: 'Résumé' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await tabs.getByRole('link', { name: 'Domaines' }).click();
  await expect(page).toHaveURL(`/rapport/${AUDIT}/domaines`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Domaines du rapport' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Sections du rapport' })
      .getByRole('link', { name: 'Domaines' }),
  ).toHaveAttribute('aria-current', 'page');
  await page
    .locator(`a[href="/rapport/${AUDIT}/domaines/qualite"]`)
    .first()
    .click();
  await expect(page).toHaveURL(`/rapport/${AUDIT}/domaines/qualite`);
  await page
    .getByRole('navigation', { name: 'Sections du rapport' })
    .getByRole('link', { name: 'Constats' })
    .click();
  await expect(page).toHaveURL(`/rapport/${AUDIT}/constats`);
  const row = page.locator(
    `a[href="/rapport/${AUDIT}/constats/qualite.liens"]`,
  );
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(`/rapport/${AUDIT}/constats/qualite.liens`);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});

test('R13 : /badge ouvre la feuille Partager sur le badge', async ({
  page,
}) => {
  await storeGuest(page);
  await page.goto(`/badge?id=${AUDIT}`);
  await expect(page).toHaveURL(`/rapport/${AUDIT}?partager=badge`);
  const sheet = page.getByRole('dialog', { name: 'Partager le rapport' });
  await expect(sheet).toBeVisible();
  const badge = sheet.locator(`a[href="/rapport/${AUDIT}/badge"]`);
  await expect(badge).toBeFocused();
  await expect(
    sheet.locator(`a[href="/rapport/${AUDIT}/imprimer"]`),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(`/rapport/${AUDIT}`);
});

// Lot 3c : le résumé explique en trois étapes comment lire le rapport, en FR et en EN.
for (const [lang, title, steps] of [
  ['fr', 'Comment lire ce rapport', ['La note', 'Les priorités', 'Le détail']],
  [
    'en',
    'How to read this report',
    ['The grade', 'The priorities', 'The detail'],
  ],
] as const) {
  test(`narration du résumé (${lang}) : trois étapes, visibles sans animation`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await storeGuest(page);
    await page.goto(`/rapport/${AUDIT}?lang=${lang}`);
    const guide = page.getByRole('region', { name: title });
    await expect(guide).toBeVisible();
    const items = guide.getByRole('listitem');
    await expect(items).toHaveCount(3);
    for (const [index, step] of steps.entries()) {
      await expect(
        items.nth(index).getByRole('heading', { level: 3 }),
      ).toHaveText(step);
      await expect(items.nth(index)).toHaveCSS('opacity', '1');
    }
  });
}

test('narration du résumé à 390 px : étapes en colonne, sans débordement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await storeGuest(page);
  await page.goto(`/rapport/${AUDIT}`);
  const items = page
    .getByRole('region', { name: 'Comment lire ce rapport' })
    .getByRole('listitem');
  await items.last().scrollIntoViewIfNeeded();
  await expect(items.last()).toHaveCSS('opacity', '1');
  const boxes = await items.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }),
  );
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
  expect(boxes[1]?.top ?? 0).toBeGreaterThan(boxes[0]?.top ?? 0);
});
