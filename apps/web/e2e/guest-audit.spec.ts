import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const octet = 1 + Math.floor(Math.random() * 200);

test.use({
  extraHTTPHeaders: {
    'x-nf-client-connection-ip': `203.0.113.${octet}`,
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

async function expectGateChrome(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  const style = await dialog.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (elt: typeof node) => {
        borderRadius: string;
        backgroundColor: string;
        zIndex: string;
        overflow: string;
        textDecorationLine: string;
      };
      document: {
        documentElement: {
          classList: { contains: (name: string) => boolean };
        };
        body: typeof node;
      };
    };
    const card = view.getComputedStyle(node);
    const root = node.parentElement
      ? view.getComputedStyle(node.parentElement)
      : null;
    const login = node.querySelector('a');
    const loginBox = login?.getBoundingClientRect();
    const cardBox = node.getBoundingClientRect();
    return {
      radius: card.borderRadius,
      bg: card.backgroundColor,
      z: root?.zIndex ?? '',
      locked: view.document.documentElement.classList.contains('gg-lock'),
      body: view.getComputedStyle(view.document.body).overflow,
      loginW: loginBox?.width ?? 0,
      cardW: cardBox.width,
      loginRadius: login ? view.getComputedStyle(login).borderRadius : '',
      loginDecor: login ? view.getComputedStyle(login).textDecorationLine : '',
    };
  });
  expect(style.radius).toBe('24px');
  expect(style.bg).toBe('rgb(255, 255, 255)');
  expect(Number(style.z)).toBeGreaterThan(1000);
  expect(style.locked).toBe(true);
  expect(style.body).toBe('hidden');
  expect(style.loginW).toBeGreaterThan(40);
  expect(style.loginW).toBeLessThan(style.cardW - 24);
  expect(style.loginRadius).toBe('999px');
  expect(style.loginDecor).toBe('none');
}

async function launch(page: Page): Promise<void> {
  await page.goto('/');
  await waitForIslands(page);
  await page.getByLabel('Adresse du site').fill('https://exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
}

const MEASURED = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

function measuredGuest(): unknown {
  const domain = (
    name: string,
    score: number | null,
    locked = false,
  ): unknown => ({
    domain: name,
    score,
    coverage: score === null ? 0 : 1,
    level: score === null ? 'untested' : 'good',
    locked,
  });
  return {
    audit: {
      id: MEASURED,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '1',
      engineVersion: '1',
      globalScore: 80,
      siteVerified: false,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-11-03T00:00:00.000Z',
      startedAt: '2026-11-03T00:00:00.000Z',
      finishedAt: '2026-11-03T00:00:01.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'unknown',
      },
    },
    domains: [
      domain('performance', 80),
      domain('seo', 70),
      domain('securite', null, true),
      domain('ecologie', 60),
      domain('accessibilite', 50),
      domain('qualite', 40),
      domain('vie_privee', null, true),
      domain('dns_email', null, true),
    ],
    findings: [],
  };
}

test('trois audits, quatrième fenêtre, domaine verrouillé, 330 px', async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (let index = 0; index < 3; index += 1) {
    await launch(page);
    await expect(page).toHaveURL(/\/audit-echoue/, { timeout: 20_000 });
    await expect(page.getByText('Audit interrompu').first()).toBeVisible();
    await expect(page.getByText('0/100')).toHaveCount(0);
    await expect(page.getByText('Votre diagnostic est prêt pour')).toHaveCount(
      0,
    );
  }

  await page.goto('/');
  await page.evaluate((payload) => {
    const storage = (
      globalThis as unknown as {
        sessionStorage: { setItem: (key: string, value: string) => void };
      }
    ).sessionStorage;
    const body = payload as { audit: { id: string } };
    storage.setItem(
      'audixio-guest-audit',
      JSON.stringify({ [body.audit.id]: payload }),
    );
  }, measuredGuest());
  await page.goto(`/rapport?id=${MEASURED}`);
  await expect(page).not.toHaveURL(/connexion/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Audit de exemple.fr' }),
  ).toBeVisible();

  await page.locator('#domaine-securite').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', {
      name: 'Connectez-vous ou inscrivez-vous',
    }),
  ).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('link', { name: 'Connexion' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.setViewportSize({ width: 330, height: 700 });
  await page.locator('#domaine-securite').click();
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width ?? 999).toBeLessThanOrEqual(330);
  await expectGateChrome(page);
  await expect(dialog.getByRole('link', { name: 'Connexion' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Inscription' })).toBeVisible();
  const narrow = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(narrow.violations, JSON.stringify(narrow.violations, null, 2)).toEqual(
    [],
  );
  await page.screenshot({
    path: '/opt/cursor/artifacts/guest-gate-mobile.png',
    fullPage: false,
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await launch(page);
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
    'href',
    '/connexion',
  );
  await expect(
    dialog.getByRole('link', { name: 'Inscription' }),
  ).toHaveAttribute('href', '/inscription');
  await expect(page).toHaveURL(/\/$/);
  await expect(page).not.toHaveURL(/\/lancer|connexion/);
  await expect(page.locator('.axn')).toBeVisible();
  await expectGateChrome(page);
  const wide = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(wide.violations, JSON.stringify(wide.violations, null, 2)).toEqual([]);
  await page.screenshot({
    path: '/opt/cursor/artifacts/guest-gate-desktop.png',
    fullPage: false,
  });
});
