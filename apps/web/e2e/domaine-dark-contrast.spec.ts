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
    fixKey: null,
    effortMinutes: 20,
    reason: null,
  };
}

function body(domainPage: boolean): unknown {
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
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 78, coverage: 1, level: 'improve' },
    ],
    findings: domainPage
      ? [
          finding('performance', 'dom.1', 'fail', 4, 'domaine.px.t1'),
          finding('performance', 'dom.2', 'warn', 2, 'domaine.px.t3'),
          finding('performance', 'dom.3', 'pass', 1, 'domaine.px.t5'),
        ]
      : [
          finding('performance', 'px.1', 'fail', 4, 'hub.px.t1'),
          finding('seo', 'px.2', 'fail', 3, 'hub.px.t2'),
        ],
  };
}

async function install(page: Page, domainPage: boolean): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 401, body: '{}' });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body(domainPage)),
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

function lum(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// #72 : le bouton « Générer le prompt » doit rester lisible en thème sombre.
test('#72 bouton prompt lisible en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await install(page, true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance&theme=dark`);
  const button = page.locator('#prompt button.fz');
  await expect(button).toBeVisible();
  // Le fond visible du bouton est peint par ses pseudo-éléments (dégradé).
  const colors = await button.evaluate((node) => {
    const label = node.querySelector('.st-def') as HTMLElement;
    const face = getComputedStyle(node, '::before').backgroundImage;
    const stops = face.match(/rgba?\([^)]*\)/g) ?? [];
    return {
      fg: getComputedStyle(label).color,
      stops,
      vue: document.documentElement.dataset.vue,
    };
  });
  expect(colors.stops.length).toBeGreaterThan(0);
  for (const stop of colors.stops)
    expect(ratio(colors.fg, stop)).toBeGreaterThanOrEqual(4.5);
});

// Même bouton sur le rapport d'exemple public.
test('#72 bouton prompt lisible en sombre sur /exemple-rapport', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=dark');
  const button = page.locator('button.fz#gen');
  await expect(button).toBeAttached();
  const colors = await button.evaluate((node) => {
    const face = getComputedStyle(node, '::before').backgroundImage;
    const labels = [...node.querySelectorAll('.st-def, .st-def span')].map(
      (el) => getComputedStyle(el).color,
    );
    return {
      labels,
      stops: face.match(/rgba?\([^)]*\)/g) ?? [],
      theme: document.documentElement.dataset.theme,
    };
  });
  expect(colors.theme).toBe('dark');
  expect(colors.stops.length).toBeGreaterThan(0);
  expect(colors.labels.length).toBeGreaterThan(0);
  for (const fg of colors.labels)
    for (const stop of colors.stops)
      expect(ratio(fg, stop)).toBeGreaterThanOrEqual(4.5);
});
