import { expect, type Page, test } from '@playwright/test';

// Étapes de correction : les segments `…` du Markdown deviennent des <code>,
// aucun backtick ne reste visible (FR et EN, /domaine « Détails » et /constat).

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
        hosting: 'netlify',
      },
    },
    domains: [{ domain: 'securite', score: 40, coverage: 1, level: 'problem' }],
    findings: [
      finding('securite', 'securite.csp', 'fail', 4, 'check.securite.csp'),
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

const FIRST = {
  fr: 'Ouvrez ou créez le fichier _headers à la racine du site publié.',
  en: 'Open or create the _headers file at the root of the published site.',
};

for (const lang of ['fr', 'en'] as const) {
  test(`/domaine Détails : <code>_headers</code> sans backtick (${lang})`, async ({
    page,
  }) => {
    await install(page, lang);
    await page.goto(
      `/rapport/${AUDIT_ID}/domaines/securite?lang=${lang}&theme=dark`,
    );
    const details = page.locator('button.det[aria-controls^="d-securite.csp"]');
    await expect(details).toBeVisible();
    await details.click();
    const panel = page.locator('[id^="d-securite.csp"] .acc-in');
    const steps = panel.locator('li');
    await expect(steps.first()).toHaveText(FIRST[lang]);
    await expect(steps.first().locator('code')).toHaveText('_headers');
    const text = await panel.textContent();
    expect(text).not.toContain('`');
  });

  test(`/constat : <code>_headers</code> sans backtick (${lang})`, async ({
    page,
  }) => {
    await install(page, lang);
    await page.goto(
      `/rapport/${AUDIT_ID}/constats/securite.csp?lang=${lang}&theme=dark`,
    );
    const steps = page.locator('#plan ol.steps li p');
    await expect(steps.first()).toHaveText(FIRST[lang]);
    await expect(steps.first().locator('code')).toHaveText('_headers');
    const text = await page.locator('#plan').textContent();
    expect(text).not.toContain('`');
  });
}
