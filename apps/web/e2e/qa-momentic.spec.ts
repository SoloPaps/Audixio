import { expect, type Page, test } from '@playwright/test';

const octet = 20 + (Date.now() % 180);

test.use({
  extraHTTPHeaders: {
    'x-nf-client-connection-ip': `198.51.100.${octet}`,
  },
});

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

const GRATUIT = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'gratuit@localhost',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-11-01T00:00:00.000Z',
  },
};

async function signIn(page: Page, session: unknown): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
}

test('le lien Sites suivis du compte gratuit affiche la page, même si Places ne répond pas', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    if (path.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.route('**/api/places', () => {
    /* Places ne répond pas : la page des sites ne doit pas rester vide. */
  });
  await signIn(page, GRATUIT);
  await page.goto('/compte');
  await waitForIslands(page);
  await page.getByRole('link', { name: 'Sites suivis', exact: true }).click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(
    page.getByRole('heading', { name: /Suivez votre premier site/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Suivez votre premier site/ }),
  ).toBeVisible();
});

test('un audit example.com sans domaine mesuré ouvre la page d’échec, jamais 0/100', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site').fill('https://example.com');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/audit-echoue/, { timeout: 20_000 });
  await expect(page.getByText('Audit interrompu').first()).toBeVisible();
  await expect(page.getByText('0/100')).toHaveCount(0);
  await expect(page.getByText('Votre diagnostic est prêt pour')).toHaveCount(0);
  await expect(page.getByText(/0 domaine/)).toHaveCount(0);
});
