import { expect, type Page, test } from '@playwright/test';

// QA Mo 05/11 M5 : la sélection du brief survit au rechargement.

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

type Row = { finding_id: string; choice: string };

async function install(page: Page, store: Row[]): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? 'http://127.0.0.1:4321';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'content-type': 'application/json',
    };
    const method = request.method().toLowerCase();
    if (method === 'options') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    if (url.includes('/rest/v1/brief_selections')) {
      if (method === 'post') {
        const body = request.postDataJSON() as Row | Row[];
        for (const row of Array.isArray(body) ? body : [body]) {
          const at = store.findIndex(
            (item) => item.finding_id === row.finding_id,
          );
          const kept = { finding_id: row.finding_id, choice: row.choice };
          if (at >= 0) store[at] = kept;
          else store.push(kept);
        }
        await route.fulfill({ status: 201, headers, body: '[]' });
        return;
      }
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(store),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(
        url.includes('/auth/v1/user') ? session.user : session,
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

async function hydrated(page: Page): Promise<void> {
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

test('M5 : « Tout ignorer » est encore là après rechargement', async ({
  page,
}) => {
  const store: Row[] = [];
  await install(page, store);
  await page.goto(`/brief?id=${AUDIT_ID}`);
  await hydrated(page);
  const fix = page.locator('.stat-fix b');
  const check = page.locator('.stat-check b');
  const skip = page.locator('.stat-check + .stat b');
  await expect(fix).toHaveText('1');
  await expect(check).toHaveText('1');
  await page.getByRole('button', { name: 'Tout ignorer' }).click();
  await expect(fix).toHaveText('0');
  await expect(skip).toHaveText('2');
  await expect.poll(() => store.length).toBe(2);
  expect(store.every((row) => row.choice === 'none')).toBe(true);
  await page.reload();
  await hydrated(page);
  await expect(fix).toHaveText('0');
  await expect(check).toHaveText('0');
  await expect(skip).toHaveText('2');
});

test('M2 (bug_3f731721) : le domaine reprend le choix « Corriger » du brief', async ({
  page,
}) => {
  const store: Row[] = [];
  await install(page, store);
  await page.goto(`/brief?id=${AUDIT_ID}`);
  await hydrated(page);
  await page.locator('#btn-ecologie').click();
  await page.locator('#panel-ecologie label', { hasText: 'Corriger' }).click();
  await expect
    .poll(
      () =>
        store.find((row) => row.finding_id === 'ecologie.hebergeur')?.choice,
    )
    .toBe('fix');
  await page.reload();
  await hydrated(page);
  await expect(
    page.locator('input[name="ecologie.hebergeur"][value="fix"]'),
  ).toBeChecked();

  await page.goto(`/domaine?id=${AUDIT_ID}&domaine=ecologie`);
  await hydrated(page);
  const sum = page.locator('#prompt .sum');
  await expect(sum).toHaveText(
    '1 constats configurés · 1 à corriger · 0 à vérifier',
  );
  await expect(
    page.locator('fieldset.choice input[value="fix"]'),
  ).toBeChecked();

  // Sens inverse : le domaine écrit la même clé que le brief (pas `checkId-N`).
  await page.locator('fieldset.choice label.o-chk').click();
  await expect(sum).toHaveText(
    '1 constats configurés · 0 à corriger · 1 à vérifier',
  );
  await expect
    .poll(
      () =>
        store.find((row) => row.finding_id === 'ecologie.hebergeur')?.choice,
    )
    .toBe('chk');
  expect(store.map((row) => row.finding_id).sort()).toEqual([
    'ecologie.hebergeur',
  ]);
  await page.goto(`/brief?id=${AUDIT_ID}`);
  await hydrated(page);
  await expect(
    page.locator('input[name="ecologie.hebergeur"][value="check"]'),
  ).toBeChecked();
});
