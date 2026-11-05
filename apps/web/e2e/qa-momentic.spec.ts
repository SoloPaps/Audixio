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

const PRO = {
  ...GRATUIT,
  user: {
    ...GRATUIT.user,
    id: '22222222-2222-4222-8222-222222222222',
    email: 'pro@localhost',
  },
};

const PRO_SITE = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';

test('la vérification de propriété du compte pro montre le jeton et les méthodes', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: PRO_SITE,
          url: 'https://bon.audigy.test',
          label: 'bon.audigy.test',
          host: 'bon.audigy.test',
          scope: 'origin',
          path_prefix: null,
          owner_id: PRO.user.id,
        }),
      });
      return;
    }
    if (path.endsWith('/rest/v1/site_verifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '33333333-3333-4333-8333-333333333333',
            method: 'meta',
            status: 'pending',
            token: 'jeton-visible-preuve',
            created_at: '2026-11-01T00:00:00.000Z',
          },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await signIn(page, PRO);
  await page.goto(`/verifier?site=${PRO_SITE}`);
  const token = page.locator('.tokbar code');
  await expect(token).toHaveText('audixio-verify=jeton-visible-preuve');
  await expect(token).toBeVisible();
  await expect(page.locator('.tokbar')).toHaveCSS('opacity', '1');
  await expect(page.locator('.tabs')).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('tab', { name: 'Balise dans la page' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Fichier HTML à la racine' }),
  ).toBeVisible();
  await page.reload();
  await expect(token).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Balise dans la page' }),
  ).toBeVisible();
});

test('un audit injoignable sans domaine mesuré ouvre la page d’échec, jamais 0/100', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setExtraHTTPHeaders({
    'x-nf-client-connection-ip': '203.0.113.210',
  });
  await page.goto('/');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site').fill('https://absent.audigy.test');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/audit-echoue/, { timeout: 20_000 });
  await expect(page.getByText('Audit interrompu').first()).toBeVisible();
  await expect(page.getByText('0/100')).toHaveCount(0);
  await expect(page.getByText('Votre diagnostic est prêt pour')).toHaveCount(0);
  await expect(page.getByText(/0 domaine/)).toHaveCount(0);
});

test('l’échec d’un site injoignable nomme ce site, pas la maquette', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setExtraHTTPHeaders({
    'x-nf-client-connection-ip': '203.0.113.211',
  });
  await page.goto('/');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site').fill('https://absent.audigy.test');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/audit-echoue/, { timeout: 20_000 });
  await expect(page.getByText('Audit interrompu').first()).toBeVisible();
  await expect(page.getByText('absent.audigy.test').first()).toBeVisible();
  await expect(page.getByText('monsite-exemple.fr')).toHaveCount(0);
  await expect(page.getByText('30 oct. 2026, 14 h 32')).toHaveCount(0);
});

test('« Relancer l’audit » relance le même site, jamais la progression nue ni la démo', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setExtraHTTPHeaders({
    'x-nf-client-connection-ip': '203.0.113.212',
  });
  await page.goto('/');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site').fill('https://absent.audigy.test');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/audit-echoue\?id=/, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Relancer l’audit' }).click();
  await expect(page).toHaveURL(/\/progression\?/, { timeout: 10_000 });
  const url = new URL(page.url());
  expect(new URL(url.searchParams.get('url') ?? 'x:').host).toBe(
    'absent.audigy.test',
  );
  await expect(page).not.toHaveURL(/exemple-rapport/);
});

async function chromeGeom(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const view = globalThis as unknown as {
      document: {
        querySelector: (selector: string) => {
          getBoundingClientRect: () => { left: number; width: number };
        } | null;
      };
      getComputedStyle: (node: {
        getBoundingClientRect: () => { left: number; width: number };
      }) => {
        paddingLeft: string;
        paddingTop: string;
        borderTopLeftRadius: string;
        columnGap: string;
      };
    };
    const read = (selector: string) => {
      const node = view.document.querySelector(selector);
      if (!node) return null;
      const style = view.getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        left: Math.round(box.left),
        width: Math.round(box.width),
        padL: style.paddingLeft,
        padT: style.paddingTop,
        radius: style.borderTopLeftRadius,
        gap: style.columnGap,
      };
    };
    const frame = (selector: string) => read(selector);
    const ink = (selector: string) => {
      const value = read(selector);
      if (!value) return null;
      return {
        padL: value.padL,
        padT: value.padT,
        radius: value.radius,
        gap: value.gap,
      };
    };
    return {
      nav: frame('.axn'),
      bar: frame('.axn-bar'),
      links: ink('.axn-links'),
      link: ink('.axn-links a'),
      foot: frame('.axf'),
      card: frame('.axf-in'),
    };
  });
}

test('la nav et le pied de Sites suivis ont la même géométrie que le compte', async ({
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
        body: JSON.stringify([
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            url: 'https://gratuit.audigy.test',
            label: 'gratuit.audigy.test',
            host: 'gratuit.audigy.test',
            is_public: false,
            public_slug: null,
            expose_security: false,
          },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.route('**/api/places', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, places: [] }),
    });
  });
  await signIn(page, GRATUIT);
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1280, 330]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/sites?theme=${theme}`);
      await expect(
        page.getByRole('heading', { name: 'gratuit.audigy.test' }),
      ).toBeVisible();
      const sites = await chromeGeom(page);
      await page.goto(`/compte?theme=${theme}`);
      await expect(page.locator('main')).toBeVisible();
      const compte = await chromeGeom(page);
      expect(sites, `${theme} ${width}`).toEqual(compte);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/sites?theme=dark');
  await expect(
    page.getByRole('heading', { name: 'gratuit.audigy.test' }),
  ).toBeVisible();
  const icon = page.locator('.inp svg');
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(10);
  const field = await page.locator('#url').evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (elt: typeof node) => { backgroundColor: string };
    };
    return view.getComputedStyle(node).backgroundColor;
  });
  expect(field).not.toBe('rgb(255, 255, 255)');
  await expect(page.getByText('Quotas · Compte gratuit')).toBeVisible();
  await expect(page.getByText('1 site suivi sur 2 autorisés.')).toBeVisible();
  await expect(page.getByText('Performance (LCP)')).toBeVisible();
  await expect(page.getByText('Éco-Index')).toBeVisible();
  await expect(page.getByText('Sécurité & TLS')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pourquoi surveiller vos domaines ?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Calcul souverain & normes' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Allez plus loin dans le suivi' }),
  ).toBeVisible();
  await expect(page.getByText('Créer un lien de partage')).toBeVisible();
  await expect(page.getByText('monsite-exemple')).toHaveCount(0);
  await expect(page.getByText('boutique.exemple')).toHaveCount(0);
  await expect(page.getByText('1,4')).toHaveCount(0);
});
