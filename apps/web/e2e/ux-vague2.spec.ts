import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const USER_ID = '11111111-1111-4111-8111-111111111111';

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

function auditBody(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 72,
      coverage: 0.5,
      createdAt: '2026-10-23T12:00:00.000Z',
      startedAt: '2026-10-23T12:00:01.000Z',
      finishedAt: '2026-10-23T12:30:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [{ domain: 'securite', score: 40, coverage: 1, level: 'problem' }],
    findings: [
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
        domain: 'ecologie',
        checkId: 'ecologie.hebergeur',
        status: 'warn',
        severity: 2,
        impact: 1,
        score: 60,
        measured: {},
        messageKey: 'ecologie.hebergeur.pass_anonyme',
        params: {},
        fixKey: null,
        effortMinutes: 10,
        reason: null,
      },
    ],
  };
}

async function install(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const origin = route.request().headers().origin ?? ORIGIN;
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'content-type': 'application/json',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(
        route.request().url().includes('/auth/v1/user')
          ? session.user
          : session,
      ),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
}

test('markdown local et limite repliée', async ({ page }) => {
  await install(page);
  const calls: string[] = [];
  await page.goto(`/rapport/${AUDIT_ID}`);
  await expect(
    page.getByRole('link', { name: 'Exporter en PDF' }),
  ).toHaveAttribute('href', new RegExp(`/rapport/${AUDIT_ID}/imprimer`));
  await page.goto(`/rapport/${AUDIT_ID}/plan`);
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();
  page.on('request', (request) => {
    calls.push(request.url());
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Télécharger en Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('audigy-exemple.fr-2026-10-23.md');
  const path = await download.path();
  expect(path).toBeTruthy();
  const markdown = await readFile(path as string, 'utf8');
  expect(markdown.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
    true,
  );
  expect(markdown).toContain('https://exemple.fr');
  expect(markdown).toContain('23 oct. 2026, 14 h 30');
  expect(markdown).not.toContain(AUDIT_ID);
  expect(calls.some((url) => url.includes('/api/audits'))).toBe(false);
  expect(calls.some((url) => /openai|anthropic|gemini/iu.test(url))).toBe(
    false,
  );
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();

  await page.goto(`/rapport/${AUDIT_ID}/domaines/ecologie`);
  await expect(page).toHaveURL(/\/domaines\/ecologie/);
  const limit = page.locator('details.finding-limit');
  await expect(limit).toHaveCount(1);
  await expect(limit).not.toHaveJSProperty('open', true);
  await expect(
    page.getByRole('heading', {
      level: 3,
      name: 'L’annuaire indique un hébergeur à électricité renouvelable.',
    }),
  ).toBeVisible();
  await expect(
    page.locator('h4, .why', { hasText: 'Cela ne couvre pas' }),
  ).toHaveCount(0);
  await limit.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(limit).toHaveJSProperty('open', true);
  await expect(
    limit.getByRole('button', { name: 'Copier le prompt' }),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 800 });
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
    await Promise.all(pending.map((item) => item.finished));
  });
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);
});

test('le score public n’exporte pas les causes internes', async ({ page }) => {
  await page.goto('/score/exemple-score/?theme=light');
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Télécharger en Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('audigy-exemple.fr-2026-10-23.md');
  const path = await download.path();
  const markdown = await readFile(path as string, 'utf8');
  expect(markdown.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
    true,
  );
  expect(markdown).toContain('Le détail de la protection n’est pas publié.');
  expect(markdown).not.toContain('fuite-hsts');
  expect(markdown).not.toContain('PageSpeed');
  expect(markdown).not.toContain('navigateur d’audit');
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);
});

test('méthode, conditions, confidentialité et mentions ont un sommaire', async ({
  page,
}) => {
  await page.goto('/methode');
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Suivez un audit, du site à la lettre.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Six lettres, des seuils fixes.',
    }),
  ).toBeVisible();
  // Sommaire de /methode v6 : le fil des sections, une entrée par section.
  // Le fil reste caché sur le héros : on le lit sans exiger qu’il soit visible.
  const dock = page.locator('nav.dock[aria-label="Sections de la page"]');
  await expect(dock.locator('.dock-l a')).toHaveCount(7);
  await expect(dock.locator('a[href="#method-repro"]')).toHaveCount(1);
  await page.locator('.m-ctas a[href="#method-repro"]').click();
  await expect(page).toHaveURL(/#method-repro$/);
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Deux moyennes, rien de caché.',
    }),
  ).toBeVisible();

  await page.goto('/cgu');
  await expect(
    page.getByRole('navigation', { name: 'Sommaire' }),
  ).toBeVisible();
  await page.goto('/confidentialite');
  await expect(
    page.getByRole('navigation', { name: 'Sommaire' }),
  ).toBeVisible();
  await page.goto('/mentions-legales');
  await expect(
    page
      .getByRole('navigation', { name: 'Sommaire' })
      .getByRole('link', { name: 'Hébergement des données' }),
  ).toHaveAttribute('href', '#hebergement');
  await page.goto('/accessibilite');
  await expect(
    page
      .getByRole('navigation', { name: 'Sommaire' })
      .getByRole('link', { name: 'État de conformité' }),
  ).toHaveAttribute('href', '#etat');
});

test('captures clair et sombre', async ({ page }) => {
  const dir = process.env.AUDIGY_SHOTS;
  test.skip(!dir, 'définir AUDIGY_SHOTS pour écrire les captures');
  await install(page);
  await page.addInitScript(() => {
    const view = globalThis as unknown as { print: () => void };
    view.print = () => undefined;
  });
  const shots: {
    name: string;
    width: number;
    theme: 'light' | 'dark';
    print: boolean;
  }[] = [];
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1280, 390]) {
      shots.push(
        { name: `rapport-${theme}-${width}`, width, theme, print: false },
        { name: `imprimer-${theme}-${width}`, width, theme, print: true },
      );
    }
  }
  for (const shot of shots) {
    await page.setViewportSize({ width: shot.width, height: 900 });
    if (shot.print) {
      await page.goto(`/rapport/${AUDIT_ID}/imprimer?theme=${shot.theme}`);
      await expect(
        page.getByRole('button', { name: 'Imprimer / enregistrer en PDF' }),
      ).toBeVisible();
    } else {
      await page.goto(`/rapport/${AUDIT_ID}?theme=${shot.theme}`);
      await expect(
        page.getByRole('heading', { name: /Audit de/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Copier le prompt' }),
      ).toHaveCount(0);
    }
    await page.addStyleTag({
      content:
        'body{padding-top:0 !important}.site-bar{position:static !important}',
    });
    await page.screenshot({
      path: `${dir}/${shot.name}.png`,
      fullPage: true,
    });
  }
});
