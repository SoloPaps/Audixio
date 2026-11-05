import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const MARKER = 'EXPORT-SERVEUR-OK';
const BAIT = 'FUITE-CLIENT-HSTS';
const FILE_NAME = 'audixio-prompt-remediation.md';

function readClip(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nav = globalThis as unknown as {
      navigator: { clipboard: { readText: () => Promise<string> } };
    };
    return nav.navigator.clipboard.readText();
  });
}

function writeClip(page: Page, value: string): Promise<void> {
  return page.evaluate((text) => {
    const nav = globalThis as unknown as {
      navigator: {
        clipboard: { writeText: (item: string) => Promise<void> };
      };
    };
    return nav.navigator.clipboard.writeText(text);
  }, value);
}

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

function fulfillBrief(
  page: Page,
  status: number,
  body: string,
  contentType = 'text/markdown; charset=utf-8',
): Promise<string[]> {
  const posted: string[] = [];
  return page
    .route('**/api/audits/*/brief', async (route) => {
      posted.push(route.request().postData() ?? '');
      await route.fulfill({
        status,
        contentType,
        headers: {
          'content-disposition': `attachment; filename="${FILE_NAME}"`,
        },
        body,
      });
    })
    .then(() => posted);
}

test('sans jeton le serveur refuse et n’écho pas le corps', async ({
  request,
}) => {
  const response = await request.post(`/api/audits/${AUDIT_ID}/brief`, {
    data: {
      selection: [{ checkId: 'securite.hsts', mode: 'fix', title: BAIT }],
    },
  });
  expect(response.status()).toBe(401);
  const text = await response.text();
  expect(text).not.toContain(BAIT);
  expect(text).not.toContain('securite');
  expect(response.headers()['content-type'] ?? '').toContain(
    'application/json',
  );
});

test('une autre méthode est refusée', async ({ request }) => {
  const response = await request.fetch(`/api/audits/${AUDIT_ID}/brief`, {
    method: 'PUT',
    data: { selection: [], note: BAIT },
  });
  expect(response.status()).toBe(405);
  const text = await response.text();
  expect(text).not.toContain(BAIT);
  expect(response.headers().allow).toBe('GET, POST');
});

test('le hub ouvre le brief et les boutons prennent le fichier serveur', async ({
  page,
}) => {
  await install(page);
  const posted = await fulfillBrief(page, 200, `${MARKER}\n`);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await page.getByRole('link', { name: 'Ouvrir le brief IA' }).click();
  await expect(page).toHaveURL(new RegExp(`/brief\\?id=${AUDIT_ID}`));
  await expect(page.getByText(MARKER)).toHaveCount(0);

  await page
    .getByRole('button', { name: 'Copier le prompt pour votre assistant IA' })
    .click();
  await expect(page.locator('#toast')).toHaveText(
    'Prompt copié dans le presse-papiers',
  );
  const copied = await readClip(page);
  expect(copied).toContain(MARKER);
  expect(copied).not.toContain('trop lent');
  expect(posted.some((body) => body.includes('performance.lcp'))).toBe(true);
  expect(posted.some((body) => body.includes('title'))).toBe(false);
  expect(posted.some((body) => body.includes(BAIT))).toBe(false);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger (.md)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(FILE_NAME);
  const path = await download.path();
  expect(path).toBeTruthy();
  const markdown = await readFile(path as string, 'utf8');
  expect(markdown).toContain(MARKER);
  expect(markdown).not.toContain('trop lent');
  expect(markdown).not.toContain(AUDIT_ID);
});

test('un refus d’accès n’écrit pas le brief du navigateur', async ({
  page,
}) => {
  await install(page);
  await fulfillBrief(
    page,
    403,
    JSON.stringify({
      error: 'forbidden',
      messageKey: 'api.error.forbidden',
    }),
    'application/json; charset=utf-8',
  );
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/brief?id=${AUDIT_ID}`);
  await writeClip(page, 'AVANT');
  let downloaded = false;
  page.on('download', () => {
    downloaded = true;
  });
  await page
    .getByRole('button', { name: 'Copier le prompt pour votre assistant IA' })
    .click();
  await expect(page.locator('#toast')).toHaveText(
    'Ce brief n’est pas disponible pour ce rapport.',
  );
  expect(await readClip(page)).toBe('AVANT');
  await page.getByRole('button', { name: 'Télécharger (.md)' }).click();
  await expect(page.locator('#toast')).toHaveText(
    'Ce brief n’est pas disponible pour ce rapport.',
  );
  expect(downloaded).toBe(false);
});

test('sans réponse serveur le domaine ne télécharge pas le texte local', async ({
  page,
}) => {
  await install(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance`);
  await writeClip(page, 'AVANT');
  let downloaded = false;
  page.on('download', () => {
    downloaded = true;
  });
  await page.getByRole('button', { name: 'Copier le brief dev' }).click();
  await expect(page.locator('#toast')).toContainText('ne répond pas');
  expect(await readClip(page)).toBe('AVANT');
  await page.getByRole('button', { name: 'Exporter le rapport' }).click();
  await expect(page.locator('#toast')).toContainText('ne répond pas');
  expect(downloaded).toBe(false);
});

test('la page domaine copie, télécharge et prépare le courriel serveur', async ({
  page,
}) => {
  await install(page);
  const posted = await fulfillBrief(page, 200, `${MARKER}\n`);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=performance`);
  const mail = page.getByRole('link', { name: 'Envoyer par e-mail' });
  await expect(mail).toHaveAttribute('href', /^mailto:\?subject=/);
  const href = await mail.getAttribute('href');
  expect(href ?? '').not.toContain('trop lent');

  await page
    .getByRole('button', { name: 'Générer et copier le prompt' })
    .click();
  await expect(page.locator('#toast')).toHaveText('Prompt copié');
  expect(await readClip(page)).toContain(MARKER);

  await page.getByRole('button', { name: 'Copier le brief dev' }).click();
  expect(await readClip(page)).toContain(MARKER);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le rapport' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(FILE_NAME);
  const markdown = await readFile((await download.path()) as string, 'utf8');
  expect(markdown).toContain(MARKER);
  expect(markdown).not.toContain('trop lent');

  await mail.evaluate((node) => {
    (node as { click: () => void }).click();
  });
  await expect
    .poll(async () => (await mail.getAttribute('href')) ?? '')
    .toContain(MARKER);
  const sent = (await mail.getAttribute('href')) ?? '';
  expect(sent.startsWith('mailto:')).toBe(true);
  expect(decodeURIComponent(sent)).not.toContain('trop lent');
  expect(posted.some((body) => body.includes('performance.lcp'))).toBe(true);
  expect(posted.every((body) => !body.includes('title'))).toBe(true);
});

test('le lien d’évitement de l’impression reste masqué hors focus clavier', async ({
  page,
}) => {
  await page.goto(`/rapport/${AUDIT_ID}/imprimer`);
  const skip = page.getByRole('link', { name: 'Aller au contenu principal' });
  await expect(skip).toBeAttached();
  const hidden = await skip.boundingBox();
  expect(hidden).toBeTruthy();
  expect((hidden?.y ?? 1) + (hidden?.height ?? 1)).toBeLessThanOrEqual(0);
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  const shown = await skip.boundingBox();
  expect(shown?.y ?? -1).toBeGreaterThanOrEqual(0);
});

test('le titre anglais du brief ne répète pas « AI » (bug #25/#86/#144)', async ({
  page,
}) => {
  await install(page);
  await page.setViewportSize({ width: 330, height: 900 });
  const pack = await (await page.request.get('/dictionnaire-en.json')).text();
  await page.addInitScript((text) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem(k: string, v: string): void };
      }
    ).localStorage;
    storage.setItem('audigy-en', text);
    storage.setItem('audigy-locale', 'en');
  }, pack);
  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator(`a[href*="/brief?id=${AUDIT_ID}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/brief\\?id=${AUDIT_ID}`));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText(/Setup of your AI prompt/);
  await expect(h1).not.toHaveText(/\bAI\s+AI\b/);
});

test('B3 sombre : les pastilles « à corriger / à vérifier » gardent leur fond', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await install(page);
  await page.goto(`/brief?id=${AUDIT_ID}&theme=dark`);
  const dots = page.locator('.dot-fix, .dot-check');
  await expect(dots.first()).toBeVisible({ timeout: 15_000 });
  const colors = await dots.evaluateAll((nodes) =>
    nodes.map((node) => {
      const view = globalThis as unknown as {
        document: { body: unknown };
        getComputedStyle: (n: unknown) => { backgroundColor: string };
      };
      const card = node.closest('.dom') ?? view.document.body;
      return {
        bg: view.getComputedStyle(node).backgroundColor,
        card: view.getComputedStyle(card).backgroundColor,
      };
    }),
  );
  expect(colors.length).toBeGreaterThan(0);
  for (const { bg, card } of colors) {
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe(card);
  }
});
