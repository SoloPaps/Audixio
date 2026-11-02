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

test('la rose se fige sur la note', async ({ page }) => {
  await install(page, false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await expect(page.locator('#rose svg, #rose .rose-fb')).toBeVisible();
  await expect(page.getByText('74/100').first()).toBeVisible();
});

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    'document.querySelectorAll("astro-island").length > 0 && [...document.querySelectorAll("astro-island")].every((node) => !node.hasAttribute("ssr"))',
  );
}

test('un repère et sa priorité se lient au survol', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await install(page, false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await ready(page);
  const pin = page.locator('.pin[data-pin="1"]');
  await expect(pin).toBeVisible();
  await expect(async () => {
    await pin.hover();
    await expect(pin).toHaveClass(/hl/, { timeout: 1000 });
  }).toPass();
  await expect(page.locator('#prio-1')).toHaveClass(/hl/);
});

test('les blocs révélés reçoivent la classe in', async ({ page }) => {
  await install(page, false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await expect(page.locator('.rv.in').first()).toBeVisible();
});

test('le compteur pose la valeur finale', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await install(page, true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance&theme=light`);
  const count = page.locator('#flt .n').first();
  await expect(count).toHaveAttribute('data-to', '3');
  await expect(count).toHaveText('3');
});

test('le toast confirme la copie du prompt', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await install(page, true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance&theme=light`);
  await page
    .getByRole('button', { name: 'Générer et copier le prompt' })
    .click();
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#toast')).toContainText('Prompt copié');
});

test('le volet de partage s’ouvre et se ferme', async ({ page }) => {
  await install(page, false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await page.getByRole('link', { name: 'Partager' }).click();
  const dialog = page.getByRole('dialog', { name: 'Partager le rapport' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Fermer/ }).click();
  await expect(dialog).toBeHidden();
});

test('le menu burger s’ouvre, piège le focus et se ferme', async ({ page }) => {
  await install(page, false);
  await page.setViewportSize({ width: 330, height: 700 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await ready(page);
  const burger = page.locator('.axn-burger');
  await expect(burger).toHaveAccessibleName('Ouvrir le menu');
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#axn-menu')).toBeVisible();
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(
    'document.activeElement?.closest("#axn-menu, .axn-burger") !== null',
  );
  expect(inside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
});

test('le retour en haut ramène au début', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await install(page, false);
  await page.setViewportSize({ width: 330, height: 700 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await ready(page);
  await page.addStyleTag({
    content: 'html{scroll-behavior:auto !important}',
  });
  await expect
    .poll(() =>
      page.evaluate(
        '(() => { const root = document.scrollingElement; root.scrollTop = root.scrollHeight; return window.scrollY; })()',
      ),
    )
    .toBeGreaterThan(600);
  const top = page.getByRole('button', { name: 'Remonter en haut' });
  await expect(top).toHaveClass(/is-on/);
  await top.click();
  await expect.poll(async () => page.evaluate('window.scrollY')).toBe(0);
});

test('le filtre et le détail d’un constat réagissent', async ({ page }) => {
  await install(page, true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance&theme=light`);
  await page.getByRole('radio', { name: /Modérés/ }).check();
  await expect(page.locator('#flt')).toHaveAttribute('data-v', 'fix');
  await expect(
    page.getByRole('heading', {
      name: 'Images trop volumineuses à l’ouverture',
    }),
  ).toBeHidden();
  const details = page.getByRole('button', { name: 'Détails' }).first();
  await details.click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.acc.open').first()).toBeVisible();
});
