import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';
import { ORIGIN } from './origin.js';

/**
 * Flash de navigation (option a, décision owner) : avant la lecture de
 * l’audit, les pages du rapport montrent un état neutre « Chargement du
 * rapport… », jamais « Analyse en cours. » ni le lien « Revenir à l’accueil ».
 */

const AUDIT_ID = '00000000-0000-4000-8000-0000000000f1';

function auditBody(): unknown {
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
        id: '00000000-0000-4000-8000-0000000000f2',
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 88, coverage: 1, level: 'good' },
    ],
    findings: [],
  };
}

/** Session connectée ; la lecture de l’audit attend que le test la libère. */
async function holdAudit(page: Page): Promise<() => void> {
  await stubSession(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/audits/**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
  return release;
}

test('HTML servi : état neutre de chargement, sans « Analyse en cours »', async ({
  request,
}) => {
  for (const path of ['/rapport', '/domaine', '/constat', '/plan', '/brief']) {
    const html = await (await request.get(`${path}?id=${AUDIT_ID}`)).text();
    expect(html, path).toContain('Chargement du rapport…');
    expect(html, path).toContain('aria-busy="true"');
    expect(html, path).not.toContain('Analyse en cours');
    expect(html, path).not.toContain('Revenir à l’accueil');
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`rapport connecté : chargement neutre puis rapport (${theme})`, async ({
    page,
  }) => {
    const release = await holdAudit(page);
    await page.goto(`/rapport/${AUDIT_ID}?theme=${theme}`);
    const status = page.getByRole('status').filter({
      hasText: 'Chargement du rapport…',
    });
    await expect(status).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.getByText('Analyse en cours')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Revenir à l’accueil' }),
    ).toHaveCount(0);
    // Lisible dans les deux thèmes (contraste du texte de chargement).
    const axe = await new AxeBuilder({ page })
      .include('[aria-busy="true"]')
      .withRules(['color-contrast'])
      .analyze();
    expect(axe.violations).toEqual([]);
    release();
    await expect(
      page.getByRole('heading', { level: 1, name: /atelier-martin\.fr/ }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  });
}

test('rapport connecté en anglais : « Loading report… »', async ({ page }) => {
  await stubSession(page);
  await page.route('**/api/audits/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    }),
  );
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  const release = await holdAudit(page);
  await page.goto(`/rapport/${AUDIT_ID}?theme=light`);
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading report…' }),
  ).toBeVisible();
  await expect(page.getByText('Chargement du rapport')).toHaveCount(0);
  release();
});

/**
 * Visiteur sans session : redirection immédiate vers la destination déjà
 * choisie par ReportView, depuis <head>, avant tout rendu. Le JavaScript de
 * l’application est bloqué pour prouver qu’on n’attend pas l’hydratation.
 */
async function asGuest(page: Page): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{}',
    }),
  );
}

async function withoutApp(page: Page): Promise<void> {
  // Tout script chargé par URL (îlots, Vite) est bloqué ; seuls les scripts
  // en ligne du HTML s’exécutent.
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'script'
      ? route.abort()
      : route.fallback(),
  );
}

function guestPayload(measured: boolean): unknown {
  const body = auditBody() as {
    audit: Record<string, unknown>;
    domains: { domain: string; score: number | null }[];
  };
  return {
    ...body,
    audit: { ...body.audit, siteVerified: false, globalScore: null },
    domains: measured
      ? body.domains
      : body.domains.map((row) => ({ ...row, score: null })),
  };
}

async function storeGuest(page: Page, payload: unknown): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([id, value]) => {
      (
        globalThis as unknown as {
          sessionStorage: { setItem: (k: string, v: string) => void };
        }
      ).sessionStorage.setItem(
        'audixio-guest-audit',
        JSON.stringify({ [id as string]: value }),
      );
    },
    [AUDIT_ID, payload],
  );
}

for (const path of [
  `/rapport/${AUDIT_ID}`,
  `/rapport/${AUDIT_ID}/constats`,
  `/rapport/${AUDIT_ID}/badge`,
]) {
  test(`visiteur sans audit : ${path} part tout de suite vers /connexion`, async ({
    page,
  }) => {
    await asGuest(page);
    await withoutApp(page);
    await page.goto(path);
    await expect(page).toHaveURL(`/connexion?next=${encodeURIComponent(path)}`);
    await expect(page.getByText('Analyse en cours')).toHaveCount(0);
  });
}

test('visiteur sans audit : un domaine du rapport part vers /connexion', async ({
  page,
}) => {
  await asGuest(page);
  await withoutApp(page);
  const target = `/rapport/${AUDIT_ID}/domaines/seo`;
  await page.goto(target);
  await expect(page).toHaveURL(`/connexion?next=${encodeURIComponent(target)}`);
});

test('visiteur, audit sans aucune mesure : /audit-echoue tout de suite', async ({
  page,
}) => {
  await storeGuest(page, guestPayload(false));
  await asGuest(page);
  await withoutApp(page);
  await page.goto(`/rapport/${AUDIT_ID}`);
  await expect(page).toHaveURL(`/audit-echoue?id=${AUDIT_ID}`);
});

test('visiteur avec son audit : le rapport s’affiche, pas de redirection', async ({
  page,
}) => {
  await storeGuest(page, guestPayload(true));
  await page.goto(`/rapport/${AUDIT_ID}`);
  await expect(page).toHaveURL(`/rapport/${AUDIT_ID}`);
  await expect(
    page.getByRole('heading', { level: 1, name: /atelier-martin\.fr/ }),
  ).toBeVisible({ timeout: 15_000 });
});

test('connecté (drapeau de cookie) : pas de redirection depuis <head>', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'audixio_connecte', value: '1', url: ORIGIN },
    { name: 'audixio_connecte', value: '1', url: 'http://127.0.0.1:4400' },
  ]);
  await withoutApp(page);
  await page.goto(`/rapport/${AUDIT_ID}`);
  await expect(page).toHaveURL(`/rapport/${AUDIT_ID}`);
  await expect(
    page.getByRole('status').filter({ hasText: 'Chargement du rapport…' }),
  ).toBeVisible();
});

test('sans identifiant ou sans domaine : pas de redirection (message)', async ({
  page,
}) => {
  await withoutApp(page);
  await page.goto('/rapport');
  await expect(page).toHaveURL('/rapport');
  // Ancienne adresse sans identifiant : la page de l’onglet, sans connexion.
  await page.goto('/domaine?domaine=seo');
  await expect(page).toHaveURL('/rapport/domaines?domaine=seo');
});

test('session simulée par /api/auth/session seulement : pas de redirection', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        expires_in: 3600,
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'ada@exemple.fr',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    }),
  );
  await page.route('**/api/audits/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    }),
  );
  await page.goto(`/rapport/${AUDIT_ID}`);
  await expect(page).toHaveURL(`/rapport/${AUDIT_ID}`);
  await expect(
    page.getByRole('heading', { level: 1, name: /atelier-martin\.fr/ }),
  ).toBeVisible({ timeout: 15_000 });
});
