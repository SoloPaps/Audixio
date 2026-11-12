import { expect, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';
import { ORIGIN } from './origin.js';

// Retour owner du 11 nov. : aucun retour visible quand on copie le prompt IA.
// Le bouton affiche « Copié » avec une coche tracée, garde sa taille, revient
// à son libellé ; l'annonce passe par le toast role="status".

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

type View = { getComputedStyle: (node: unknown) => Record<string, string> };

async function open(
  page: Page,
  theme: string,
  motion: 'reduce' | 'no-preference',
) {
  await page.emulateMedia({ reducedMotion: motion });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await install(page);
  await page.route('**/api/audits/*/brief', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/markdown; charset=utf-8',
      body: 'PROMPT-OK\n',
    }),
  );
  await page.goto(`/rapport/${AUDIT_ID}/brief?theme=${theme}`);
}

for (const theme of ['light', 'dark']) {
  test(`brief (${theme}) : « Copier le prompt » montre « Copié » et sa coche`, async ({
    page,
  }) => {
    await open(page, theme, 'no-preference');
    const button = page.getByRole('button', {
      name: 'Copier le prompt pour votre assistant IA',
    });
    await button.scrollIntoViewIfNeeded();
    const before = await button.boundingBox();
    await button.click();
    const done = page.locator('.md-actions .copy-btn[data-copied="true"]');
    await expect(done).toBeVisible();
    await expect(done).toHaveAccessibleName('Copié');
    await expect(done.locator('.tick')).toBeVisible();
    expect(
      await done
        .locator('.done')
        .evaluate(
          (node) =>
            (globalThis as unknown as View).getComputedStyle(node)
              .animationName,
        ),
    ).toContain('copy-pop');
    await expect(page.locator('#toast')).toHaveText(
      'Prompt copié dans le presse-papiers',
    );
    await expect(page.locator('#toast')).toHaveAttribute('aria-live', 'polite');
    const after = await done.boundingBox();
    expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(
      1,
    );
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
      1,
    );
    // Retour au libellé de départ.
    await expect(button).toBeVisible({ timeout: 4000 });
    await expect(done).toHaveCount(0);
  });
}

test('brief : mouvement réduit, « Copié » sans animation', async ({ page }) => {
  await open(page, 'light', 'reduce');
  await page
    .getByRole('button', { name: 'Copier le prompt pour votre assistant IA' })
    .click();
  const done = page.locator('.md-actions .copy-btn[data-copied="true"]');
  await expect(done).toHaveAccessibleName('Copié');
  expect(
    await done
      .locator('.done')
      .evaluate(
        (node) =>
          (globalThis as unknown as View).getComputedStyle(node).animationName,
      ),
  ).toBe('none');
});

test('brief EN : the button reads « Copied »', async ({ page }) => {
  await open(page, 'light', 'reduce');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const button = page.locator('.md-actions .copy-btn');
  await expect(button).toHaveAccessibleName(/AI assistant/);
  await button.click();
  await expect(
    page.locator('.md-actions .copy-btn[data-copied="true"]'),
  ).toHaveAccessibleName('Copied');
});
