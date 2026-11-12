import { readFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { HOST, ORIGIN } from './origin.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

function cors(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers':
      'authorization, apikey, content-type, prefer, accept, x-client-info, x-supabase-api-version',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-credentials': 'true',
  };
}

async function waitForIslands(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const root = globalThis as unknown as {
      document: {
        querySelectorAll: (
          selector: string,
        ) => Iterable<{ hasAttribute: (name: string) => boolean }>;
      };
    };
    const islands = [...root.document.querySelectorAll('astro-island')];
    return (
      islands.length > 0 &&
      islands.every((island) => !island.hasAttribute('ssr'))
    );
  });
}

async function expectNoViolations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const view = globalThis as unknown as {
      document: {
        getAnimations: () => Array<{
          effect: { getTiming: () => { iterations: number } } | null;
          finished: Promise<unknown>;
        }>;
      };
    };
    const pending = view.document.getAnimations().filter((item) => {
      const iterations = item.effect?.getTiming().iterations ?? 1;
      return Number.isFinite(iterations);
    });
    await Promise.all(
      pending.map((item) => item.finished.catch(() => undefined)),
    );
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

function auditBody(status: 'queued' | 'running' | 'done'): unknown {
  const done = status === 'done';
  return {
    audit: {
      id: AUDIT_ID,
      status,
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: done ? 72 : null,
      coverage: done ? 0.5 : null,
      createdAt: '2026-10-23T12:00:00.000Z',
      startedAt: status === 'queued' ? null : '2026-10-23T12:00:01.000Z',
      finishedAt: done ? '2026-10-23T12:30:00.000Z' : null,
      error: null,
      site: {
        id: SITE_ID,
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: done
      ? [
          { domain: 'performance', score: 86, coverage: 1, level: 'good' },
          { domain: 'seo', score: 90, coverage: 1, level: 'good' },
          { domain: 'securite', score: 40, coverage: 1, level: 'problem' },
        ]
      : [],
    findings: done
      ? [
          {
            domain: 'securite',
            checkId: 'securite.https',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'securite.https.fail',
            params: {},
            fixKey: 'securite.https',
            effortMinutes: 15,
            reason: null,
          },
          {
            domain: 'securite',
            checkId: 'securite.hsts',
            status: 'warn',
            severity: 2,
            impact: 2,
            score: 0.5,
            measured: {},
            messageKey: 'securite.hsts.warn_short',
            params: {},
            fixKey: 'securite.hsts',
            effortMinutes: 10,
            reason: null,
          },
          {
            domain: 'vie_privee',
            checkId: 'vie_privee.traceurs',
            status: 'untested',
            severity: 1,
            impact: 1,
            score: null,
            measured: {},
            messageKey: 'finding.untested',
            params: {},
            fixKey: null,
            effortMinutes: null,
            reason: 'reason.runner_absent',
          },
          {
            domain: 'seo',
            checkId: 'seo.title',
            status: 'pass',
            severity: 1,
            impact: 1,
            score: 1,
            measured: {},
            messageKey: 'vie_privee.traceurs.pass',
            params: {},
            fixKey: null,
            effortMinutes: null,
            reason: null,
          },
        ]
      : [],
  };
}

/** Invité : /lancer doit passer par /progression avant le rapport. */
async function expectGuestThroughProgression(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/progression\?id=/, { timeout: 20_000 });
  // Un audit déjà terminé (réponse guest « done ») ne rejoue plus l’aperçu
  // qui faisait reculer la barre (M8). Le lien « Revenir à l’accueil »
  // n’est visible que pendant l’analyse ; ensuite « Voir le rapport ».
  const home = page.getByRole('link', { name: 'Revenir à l’accueil' });
  const reportReady = page.getByRole('link', { name: 'Voir le rapport' });
  await expect(home.or(reportReady)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  if (await home.isVisible()) {
    await expect(page.getByRole('status')).toContainText('Rapport prêt', {
      timeout: 15_000,
    });
  }
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Votre diagnostic est prêt pour',
  );
  await expect(page.locator('#leadT')).toContainText('L’analyse est terminée');
  await expect(page.locator('.url-host')).toHaveText('exemple.fr');
  const report = page.getByRole('link', { name: 'Voir le rapport' });
  await expect(report).toBeInViewport();
  const previous = page.viewportSize();
  await page.setViewportSize({ width: 330, height: 800 });
  await expect(report).toBeInViewport();
  const hostBox = await page.locator('.url-host').boundingBox();
  const chipBox = await page.locator('.url .p-sec').boundingBox();
  expect(hostBox).not.toBeNull();
  expect(chipBox).not.toBeNull();
  expect((hostBox?.x ?? 0) + (hostBox?.width ?? 0)).toBeLessThanOrEqual(
    (chipBox?.x ?? 0) + 1,
  );
  if (previous) await page.setViewportSize(previous);
  await report.click();
  await expect(page).toHaveURL(/\/rapport\?id=/);
}

async function installMocks(
  page: Page,
  options: { immediate?: boolean } = {},
): Promise<void> {
  const sites: Record<string, unknown>[] = [];
  let reads = 0;
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = request.headers().origin ?? ORIGIN;
    const headers = {
      ...cors(origin),
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors(origin) });
      return;
    }
    if (url.pathname.endsWith('/auth/v1/otp')) {
      await route.fulfill({ status: 200, headers, body: '{}' });
      return;
    }
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(session.user),
      });
      return;
    }
    if (url.pathname.endsWith('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(session),
      });
      return;
    }
    if (
      url.pathname.endsWith('/rest/v1/sites') &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      const row = {
        id: '22222222-2222-4222-8222-222222222222',
        ...body,
      };
      sites.push(row);
      const accept = request.headers().accept ?? '';
      await route.fulfill({
        status: 201,
        headers,
        body: JSON.stringify(accept.includes('vnd.pgrst.object') ? row : [row]),
      });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(sites),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '{}' });
  });

  await page.route('**/api/guest-audits', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        auditId: AUDIT_ID,
        status: 'done',
        view: auditBody('done'),
      }),
    });
  });

  await page.route('**/api/audits**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          auditId: AUDIT_ID,
          status: 'queued',
          existing: false,
        }),
      });
      return;
    }
    reads += 1;
    const status = options.immediate
      ? 'done'
      : reads === 1
        ? 'queued'
        : reads === 2
          ? 'running'
          : 'done';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody(status)),
    });
  });
}

test('parcours accueil, connexion, progression, rapport et sites', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vérifiez la santé de votre site, gratuitement.',
    }),
  ).toBeVisible();
  await page.getByLabel('Adresse du site').fill('https://exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expectGuestThroughProgression(page);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Audit de exemple.fr' }),
  ).toBeVisible();
  await page.goto('/connexion');
  await waitForIslands(page);
  await page.route('**/api/auth/connexion', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'invalid_credentials' }),
    });
  });
  await page.getByLabel('Adresse e-mail').fill('ada@exemple.fr');
  await page.getByLabel('Mot de passe').fill('phrase-de-test-12');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Adresse ou mot de passe incorrect.',
  );

  await page.evaluate(
    ({ value, next }) => {
      const storage = (
        globalThis as unknown as {
          localStorage: { setItem: (key: string, item: string) => void };
        }
      ).localStorage;
      storage.setItem('audigy-auth', JSON.stringify(value));
      storage.setItem('audigy-next', next);
    },
    {
      value: session,
      next: '/progression?url=https%3A%2F%2Fexemple.fr',
    },
  );
  await page.goto('/connexion?retour=1');
  await expect(page).toHaveURL(/\/progression/, { timeout: 15_000 });

  const status = page.getByRole('status');
  await expect(status).toContainText('Analyse en cours');
  await expect(
    page.getByRole('link', { name: 'Revenir à l’accueil' }),
  ).toBeVisible();
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await expect(status).toContainText('Rapport prêt', { timeout: 15_000 });
  await page.getByRole('link', { name: 'Voir le rapport' }).click();
  await expect(page).toHaveURL(/\/rapport/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Audit de exemple.fr',
    }),
  ).toBeVisible();
  await expect(page.getByText('72/100').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /^Sécurité/ })).toBeVisible();
  await page.getByRole('link', { name: /^Sécurité/ }).click();
  await expect(page).toHaveURL(/domaine=securite/);
  await expect(
    page.getByRole('heading', { name: "Forcer l'adresse chiffrée" }),
  ).toBeVisible();
  await expect(page.getByText('Aucun traceur connu')).toBeHidden();
  await page.getByRole('button', { name: 'Détails' }).first().click();
  await expect(
    page.getByRole('link', { name: 'Vue d’ensemble du rapport' }),
  ).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/sites');
  await waitForIslands(page);
  await expect(
    page.getByRole('heading', { name: 'Suivez votre premier site' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Lancer un audit' }),
  ).toHaveAttribute('href', '/#audit-form');
  await page.evaluate(() => {
    const storage = (
      globalThis as unknown as {
        localStorage: { getItem: (key: string) => string | null };
      }
    ).localStorage;
    return storage.getItem('audigy-auth');
  });
  await page.unroute('http://127.0.0.1:54321/**');
  const seeded: Record<string, unknown>[] = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      owner_id: session.user.id,
      url: 'https://exemple.fr',
      host: 'exemple.fr',
      label: 'exemple.fr',
      scope: 'origin',
      path_prefix: null,
      hosting: 'other',
      is_public: false,
      public_slug: null,
      expose_security: false,
    },
  ];
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (
      url.pathname.endsWith('/rest/v1/sites') &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      const row = {
        id: '22222222-2222-4222-8222-222222222222',
        ...body,
      };
      seeded.push(row);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(row),
      });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(seeded),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.goto('/sites');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site à suivre').fill('notes.exemple.fr');
  await page.getByRole('button', { name: 'Ajouter un site' }).click();
  await expect(page.locator('#toast')).toContainText(
    'Site ajouté à la file d’analyse : notes.exemple.fr',
  );
  await expect(page.getByText('notes.exemple.fr').first()).toBeVisible();
  await expectNoViolations(page);
});

test('parcours invité : progression puis rapport, sans compte', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vérifiez la santé de votre site, gratuitement.',
    }),
  ).toBeVisible();
  await page.getByLabel('Adresse du site').fill('https://exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expectGuestThroughProgression(page);
  await expect(page).not.toHaveURL(/\/connexion/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Audit de exemple.fr' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Connectez-vous ou inscrivez-vous' }),
  ).toHaveCount(0);
});

test('parcours invité : le plafond ouvre la fenêtre sans rapport', async ({
  page,
}) => {
  await page.route('**/api/guest-audits', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'retry-after': '3600' },
      body: JSON.stringify({
        error: 'guest_limit',
        messageKey: 'api.error.guest_limit',
        retryAfter: 3600,
      }),
    });
  });
  await page.goto('/');
  await page.getByLabel('Adresse du site').fill('https://exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).not.toHaveURL(/\/lancer/);
  const gate = page.getByRole('dialog', {
    name: 'Connectez-vous ou inscrivez-vous',
  });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole('link', { name: 'Connexion' })).toBeVisible();
  await expect(gate.getByRole('link', { name: 'Inscription' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/progression\?id=/);
  await expect(page).not.toHaveURL(/\/rapport/);
});

test('connexion et sites vides sans violation, clair et sombre', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/connexion?theme=light');
  await waitForIslands(page);
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  await expectNoViolations(page);
  await page.goto('/connexion?theme=dark');
  await waitForIslands(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Thème' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectNoViolations(page);
  await page.goto('/sites?theme=light');
  await waitForIslands(page);
  await expect(
    page.getByText('Connectez-vous pour voir vos sites.'),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('le rapport donne la note, trois priorités et le pont vers le brief', async ({
  page,
}) => {
  await installMocks(page, { immediate: true });
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await expect(page.getByText('72/100').first()).toBeVisible();
  const section = page.getByRole('region', { name: 'Priorités' });
  await expect(section).toBeVisible();
  await expect(section.getByRole('listitem')).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: 'Ouvrir le brief IA' }),
  ).toHaveAttribute('href', new RegExp(`/brief\\?id=${AUDIT_ID}`));
  await section.getByRole('link').first().click();
  await expect(page).toHaveURL(/domaine=securite#finding-/);
  await page.getByRole('button', { name: 'Détails' }).first().click();
  await expect(
    page.getByText('Activez le certificat de votre hébergeur.'),
  ).toBeVisible();
});

test('rapport sombre sans violation', async ({ page }) => {
  await installMocks(page, { immediate: true });
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=dark`);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Audit de exemple.fr',
    }),
  ).toBeVisible();
  await expect(
    page.locator('.axn-lang [aria-current="true"]').first(),
  ).toHaveText('FR');
  await expectNoViolations(page);
});

function builtHomeBytes(): number {
  const dist = path.resolve('dist');
  const seen = new Set<string>();
  const queue = ['index.html'];
  let bytes = 0;
  while (queue.length > 0) {
    const rel = queue.pop();
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);
    const file = path.join(dist, rel);
    const data = readFileSync(file);
    bytes += data.length;
    if (!/\.(css|js)$/i.test(rel) && rel !== 'index.html') continue;
    const text = data.toString('utf8');
    const refs = [
      ...text.matchAll(/(?:src|href)="([^"]+)"/g),
      ...text.matchAll(/url\(([^)]+)\)/g),
      ...text.matchAll(/["']([^"']+\.(?:js|css|woff2))["']/g),
    ];
    for (const match of refs) {
      const raw = (match[1] ?? '').replace(/['"]/g, '').split('?')[0] ?? '';
      if (raw === '' || raw.startsWith('data:') || raw.startsWith('http'))
        continue;
      const next = raw.startsWith('/')
        ? decodeURIComponent(raw.slice(1))
        : path.posix.normalize(path.posix.join(path.posix.dirname(rel), raw));
      if (!/\.(css|js|woff2|svg|png|webp|ico)$/i.test(next)) continue;
      if (!seen.has(next)) queue.push(next);
    }
  }
  return bytes;
}

test('accueil sous 500 Ko, sans tiers, et sans défilement à 320 px', async ({
  page,
}) => {
  expect(builtHomeBytes()).toBeLessThan(500 * 1024);
  const hosts = new Set<string>();
  page.on('response', (response) => {
    hosts.add(new URL(response.url()).host);
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect([...hosts].filter((host) => host !== HOST)).toEqual([]);
  for (const width of [320, 640, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const widths = await page.evaluate(() => {
      const root = globalThis as unknown as {
        document: {
          documentElement: { scrollWidth: number; clientWidth: number };
        };
      };
      return {
        scrollWidth: root.document.documentElement.scrollWidth,
        clientWidth: root.document.documentElement.clientWidth,
      };
    });
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
  }
});
