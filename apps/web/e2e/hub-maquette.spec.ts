import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

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

function auditBody(locked: boolean): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: locked ? null : 74,
      siteVerified: !locked,
      partialLabel: locked ? 'partielle · 1 domaines · site non vérifié' : null,
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
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      {
        domain: 'securite',
        score: locked ? null : 62,
        coverage: 1,
        level: locked ? 'locked' : 'improve',
        locked,
      },
    ],
    findings: locked
      ? [
          {
            domain: 'performance',
            checkId: 'performance.poids',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'performance.poids.fail',
            params: {},
            fixKey: null,
            effortMinutes: 20,
            reason: null,
          },
        ]
      : [
          {
            domain: 'performance',
            checkId: 'performance.poids',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'performance.poids.fail',
            params: {},
            fixKey: null,
            effortMinutes: 20,
            reason: null,
          },
          {
            domain: 'securite',
            checkId: 'securite.hsts',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'securite.hsts.fail',
            params: {},
            fixKey: 'securite.hsts',
            effortMinutes: 10,
            reason: null,
          },
        ],
  };
}

async function install(page: Page, locked = false): Promise<void> {
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
      body: JSON.stringify(auditBody(locked)),
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

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test('hub, partage et domaine ouvert, bureau et 330 px', async ({ page }) => {
  await install(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await expect(
    page.getByRole('heading', { name: 'Audit de atelier-martin.fr' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Priorités' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Les 8 domaines' }),
  ).toBeVisible();
  await expect(page.getByText(/\/100/)).toHaveCount(0);
  await page.screenshot({
    path: '/opt/cursor/artifacts/hub-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Partager' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Partager le rapport' }),
  ).toBeVisible();
  await page.screenshot({
    path: '/opt/cursor/artifacts/hub-partage.png',
    fullPage: false,
  });
  await page
    .getByRole('dialog', { name: 'Partager le rapport' })
    .getByRole('button', { name: 'Fermer' })
    .click();
  await page.getByRole('link', { name: /^Vitesse/ }).click();
  await expect(page).toHaveURL(/domaine=performance/);
  await expect(page.getByRole('heading', { name: 'Vitesse' })).toBeVisible();
  await expect(page.getByLabel('Statut').first()).toBeVisible();
  await page.screenshot({
    path: '/opt/cursor/artifacts/domaine-desktop.png',
    fullPage: true,
  });
  await axe(page);

  await page.setViewportSize({ width: 330, height: 700 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await expect(
    page.getByRole('heading', { name: 'Audit de atelier-martin.fr' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflow).toBe(true);
  await page.screenshot({
    path: '/opt/cursor/artifacts/hub-330.png',
    fullPage: true,
  });
  await axe(page);
});

test('domaine verrouillé sans indice précis', async ({ page }) => {
  await install(page, true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=securite&theme=light`);
  await expect(
    page.getByRole('heading', { name: 'Protection', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Verrouillé').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Prouver la propriété' }),
  ).toBeVisible();
  await expect(page.getByText(/HSTS|X-Frame|CSP/)).toHaveCount(0);
  await page.screenshot({
    path: '/opt/cursor/artifacts/domaine-verrouille-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 330, height: 700 });
  await page.screenshot({
    path: '/opt/cursor/artifacts/domaine-verrouille-330.png',
    fullPage: true,
  });
  await axe(page);
});

test('page de preuve, bureau et 330 px', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 401, body: '{}' });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/verifier?theme=light');
  await expect(
    page.getByRole('heading', { name: 'Prouver que le site est à vous' }),
  ).toBeVisible();
  await expect(page.getByText('Connectez-vous pour vérifier un site.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tarifs' })).toBeVisible();
  await page.screenshot({
    path: '/opt/cursor/artifacts/preuve-desktop.png',
    fullPage: true,
  });
  await axe(page);
  await page.setViewportSize({ width: 330, height: 700 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflow).toBe(true);
  await page.screenshot({
    path: '/opt/cursor/artifacts/preuve-330.png',
    fullPage: true,
  });
  await axe(page);

  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const url = route.request().url();
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: SITE_ID,
          url: 'https://exemple.fr',
          label: 'exemple.fr',
          host: 'exemple.fr',
          scope: 'origin',
          path_prefix: null,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/verifier?site=${SITE_ID}&theme=light`);
  await expect(page.getByRole('tab', { name: 'Balise dans la page' })).toBeVisible();
  await page.screenshot({
    path: '/opt/cursor/artifacts/preuve-methodes.png',
    fullPage: true,
  });
  await axe(page);
});
