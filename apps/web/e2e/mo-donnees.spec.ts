import { expect, type Page, test } from '@playwright/test';

// QA Mo 05/11 : données affichées (étapes, filtres, brief, alertes, graphique).

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';
const SITE_ID = '00000000-0000-4000-8000-0000000000bb';

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

function finding(
  domain: string,
  checkId: string,
  status: string,
  severity: number,
  messageKey: string,
): unknown {
  return {
    domain,
    checkId,
    status,
    severity,
    impact: 3,
    score: status === 'pass' ? 100 : 0,
    measured: {},
    messageKey,
    params: {},
    fixKey: checkId,
    effortMinutes: 20,
    reason: null,
  };
}

function body(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 74,
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
        hosting: 'other',
      },
    },
    domains: [{ domain: 'securite', score: 40, coverage: 1, level: 'problem' }],
    findings: [
      finding('securite', 'securite.frames', 'fail', 3, 'securite.frames.fail'),
      finding(
        'securite',
        'securite.hsts',
        'warn',
        2,
        'securite.hsts.warn_short',
      ),
    ],
  };
}

async function install(page: Page, lang: 'fr' | 'en'): Promise<void> {
  await page.addInitScript(
    ([value, locale]) => {
      localStorage.setItem('audigy-auth', JSON.stringify(value));
      localStorage.setItem('audigy-locale', locale as string);
    },
    [session, lang] as const,
  );
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 401, body: '{}' });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body()),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('action_plan') ? '[]' : 'null',
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
}

const HEADER = {
  fr: /Ajoutez l.en-tête suivant\./u,
  en: /Add the following header\./u,
};

for (const lang of ['fr', 'en'] as const) {
  test(`M1 : /domaine Détails montre l’en-tête à ajouter (${lang})`, async ({
    page,
  }) => {
    await install(page, lang);
    await page.goto(`/domaine?id=${AUDIT_ID}&domaine=securite&lang=${lang}`);
    const details = page.locator(
      'button.det[aria-controls^="d-securite.frames"]',
    );
    await expect(details).toBeVisible();
    await details.click();
    const panel = page.locator('[id^="d-securite.frames"] .acc-in');
    const step = panel.locator('li').filter({ hasText: HEADER[lang] });
    await expect(step).toHaveCount(1);
    await expect(step.locator('pre.step-code code')).toHaveText(
      "Content-Security-Policy: frame-ancestors 'none'",
    );
    await expect(panel.locator('pre.step-code').nth(1)).toHaveText(
      'X-Frame-Options: DENY',
    );
  });

  test(`M1 : /constat montre l’en-tête à ajouter (${lang})`, async ({
    page,
  }) => {
    await install(page, lang);
    await page.goto(`/constat?id=${AUDIT_ID}&check=securite.hsts&lang=${lang}`);
    const code = page.locator('#plan ol.steps li pre.step-code code');
    await expect(code.first()).toContainText('Strict-Transport-Security');
  });
}
