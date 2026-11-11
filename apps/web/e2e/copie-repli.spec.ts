import { expect, type Page, test } from '@playwright/test';

// Retour owner du 11 nov. : « le bouton copier ne marche pas ». En http sur
// une adresse du réseau local (http://192.168.x.x:8888), navigator.clipboard
// n'existe pas ; un refus du navigateur fait échouer writeText. Les boutons
// annonçaient « Copié » sans rien copier, ou affichaient une erreur.
// Ici on retire l'API (ou on la fait refuser) et on lit le vrai presse-papiers.

type Mode = 'absente' | 'refus';

async function breakClipboard(page: Page, mode: Mode): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript((how) => {
    const host = globalThis as unknown as {
      __clip?: unknown;
      navigator: { clipboard: unknown };
      Navigator: { prototype: object };
    };
    const real = host.navigator.clipboard as {
      readText: () => Promise<string>;
      writeText: (text: string) => Promise<void>;
    };
    host.__clip = real;
    const fake =
      how === 'absente'
        ? undefined
        : {
            readText: () => real.readText(),
            writeText: () =>
              Promise.reject(new DOMException('refus', 'NotAllowedError')),
          };
    Object.defineProperty(host.Navigator.prototype, 'clipboard', {
      get: () => fake,
      configurable: true,
    });
  }, mode);
}

function realClip(page: Page): Promise<string> {
  return page.evaluate(() =>
    (
      globalThis as unknown as { __clip: { readText: () => Promise<string> } }
    ).__clip.readText(),
  );
}

function seedClip(page: Page): Promise<void> {
  return page.evaluate(() =>
    (
      globalThis as unknown as {
        __clip: { writeText: (text: string) => Promise<void> };
      }
    ).__clip.writeText('AVANT'),
  );
}

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const MARKER = 'EXPORT-SERVEUR-OK';
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
    domains: [
      { domain: 'performance', score: 40, coverage: 1, level: 'problem' },
      { domain: 'ecologie', score: 60, coverage: 1, level: 'improve' },
    ],
    findings: [
      {
        domain: 'performance',
        checkId: 'performance.lcp',
        status: 'fail',
        severity: 4,
        impact: 3,
        score: 0,
        measured: { secondes: 8 },
        messageKey: 'performance.lcp.fail',
        params: { secondes: 8 },
        fixKey: 'performance.lcp',
        effortMinutes: 20,
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
    const origin = route.request().headers().origin ?? 'http://127.0.0.1:4321';
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
    if (route.request().url().includes('/brief')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
}

for (const mode of ['absente', 'refus'] as const) {
  test(`brief : « Copier le prompt » copie vraiment (API ${mode})`, async ({
    page,
  }) => {
    await breakClipboard(page, mode);
    await install(page);
    await page.route('**/api/audits/*/brief', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/markdown; charset=utf-8',
        body: `${MARKER}\n`,
      }),
    );
    await page.goto(`/brief?id=${AUDIT_ID}`);
    await seedClip(page);
    await page
      .getByRole('button', { name: 'Copier le prompt pour votre assistant IA' })
      .click();
    await expect(page.locator('#toast')).toHaveText(
      'Prompt copié dans le presse-papiers',
    );
    expect(await realClip(page)).toContain(MARKER);
  });

  test(`demande d'accès : « Copier » copie le lien (API ${mode})`, async ({
    page,
  }) => {
    await breakClipboard(page, mode);
    await page.goto('/demande-acces');
    await seedClip(page);
    const link = await page.locator('#share-link').inputValue();
    expect(link).toMatch(/^https:\/\//);
    await page.locator('#copy-btn').click();
    await expect.poll(() => realClip(page)).toBe(link);
  });

  test(`mentions légales : l'adresse se copie (API ${mode})`, async ({
    page,
  }) => {
    await breakClipboard(page, mode);
    await page.goto('/mentions-legales');
    await seedClip(page);
    const button = page.locator('button.copy[data-copy]').first();
    const value = (await button.getAttribute('data-copy')) ?? '';
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect.poll(() => realClip(page)).toBe(value);
  });

  test(`exemple : « Générer et copier le prompt » copie (API ${mode})`, async ({
    page,
  }) => {
    await breakClipboard(page, mode);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/exemple-rapport#n2');
    await seedClip(page);
    const gen = page.locator('#gen');
    await gen.scrollIntoViewIfNeeded();
    await gen.click();
    await expect(page.locator('#plive')).toHaveText(
      'Prompt copié dans le presse-papiers',
    );
    expect(await realClip(page)).toContain('Tu es un développeur web');
  });
}
