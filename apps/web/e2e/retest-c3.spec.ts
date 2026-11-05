import { expect, type Page, test } from '@playwright/test';

// Retest C3 : en EN, les titres et raisons des constats viennent du catalogue anglais.
const AUDIT_ID = '00000000-0000-4000-8000-0000000000c3';
const SITE_ID = '00000000-0000-4000-8000-0000000000c4';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const CHECKS = [
  ['securite', 'securite.frames', 'securite.frames.fail', 'fail'],
  ['securite', 'securite.xcto', 'securite.xcto.fail', 'fail'],
  ['securite', 'securite.hsts', 'securite.hsts.fail_missing', 'fail'],
  ['seo', 'seo.description', 'seo.description.fail_missing', 'warn'],
] as const;

const FRENCH = [
  'Interdire l',
  'Empêcher le navigateur de deviner le type',
  'Garder le navigateur en adresse chiffrée',
  'Écrire une description utile',
  'Un autre site peut alors présenter vos pages',
  'S’il devine mal',
  "S'il devine mal",
];

function auditBody(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
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
        id: SITE_ID,
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'netlify',
      },
    },
    domains: [
      { domain: 'securite', score: 50, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 70, coverage: 1, level: 'improve' },
    ],
    findings: CHECKS.map(([domain, checkId, messageKey, status]) => ({
      domain,
      checkId,
      status,
      severity: 4,
      impact: 3,
      score: 0,
      measured: {},
      messageKey,
      params: {},
      fixKey: checkId,
      effortMinutes: 10,
      reason: null,
    })),
  };
}

async function install(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('action_plan') ? '[]' : 'null',
    });
  });
}

async function noFrench(page: Page): Promise<void> {
  const text = (await page.locator('main').textContent()) ?? '';
  for (const line of FRENCH) expect(text, line).not.toContain(line);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await install(page);
});

test('C3 : /rapport en EN nomme les constats en anglais', async ({ page }) => {
  await page.goto(`/rapport?id=${AUDIT_ID}&lang=en`);
  await expect(
    page.getByText('Forbid display inside a frame').first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText('Stop the browser from guessing the type').first(),
  ).toBeVisible();
  await noFrench(page);
});

test('C3 : /plan en EN, tâches et raisons en anglais', async ({ page }) => {
  await page.goto(`/plan?id=${AUDIT_ID}&lang=en`);
  await expect(
    page.getByText('Forbid display inside a frame').first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText('Write a useful description').first(),
  ).toBeVisible();
  await noFrench(page);
});

test('C3 : /brief en EN, prompt et libellés accessibles en anglais', async ({
  page,
}) => {
  await page.goto(`/brief?id=${AUDIT_ID}&lang=en`);
  const preview = page.getByRole('region', { name: 'Markdown brief preview' });
  await expect(preview).toContainText('Findings- Write a useful description', {
    timeout: 15_000,
  });
  await expect(preview).toContainText('Forbid display inside a frame');
  await expect(preview).toContainText(
    'If it guesses wrong, a file meant for download can run as code.',
  );
  await expect(
    page.locator('legend', {
      hasText: 'Action for “Forbid display inside a frame”',
    }),
  ).toHaveCount(1);
  await noFrench(page);
});

test('C3 : en FR, les fiches restent en français', async ({ page }) => {
  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await expect(
    page
      .getByText('Interdire l’affichage dans un cadre')
      .or(page.getByText("Interdire l'affichage dans un cadre"))
      .first(),
  ).toBeVisible({ timeout: 15_000 });
});
