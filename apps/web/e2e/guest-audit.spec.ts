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

test('trois audits, quatrième fenêtre, domaine verrouillé, 330 px', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const ids: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    await launch(page);
    await expect(page).toHaveURL(/\/progression\?id=/, { timeout: 20_000 });
    const voir = page.locator('#reportBtn');
    await expect(voir).toBeVisible();
    await expect(voir).toContainText('Voir le rapport');
    const place = await voir.evaluate((node) => {
      const root = globalThis as unknown as {
        document: {
          getElementById: (
            id: string,
          ) => { getBoundingClientRect: () => { top: number } } | null;
        };
      };
      const mock = root.document.getElementById('mock');
      const btn = node.getBoundingClientRect();
      const stage = mock?.getBoundingClientRect();
      return { gap: stage ? stage.top - btn.bottom : 0 };
    });
    expect(place.gap).toBeGreaterThan(16);
    await voir.click();
    await expect(page).toHaveURL(/\/rapport\?id=/);
    ids.push(new URL(page.url()).searchParams.get('id') ?? '');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Audit de exemple.fr' }),
    ).toBeVisible();
    await expect(
      page.getByText(/partielle · \d+ domaines · site non vérifié/),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Verrouillé').first()).toBeVisible();
  }

  await page.goto(`/rapport?id=${ids[0]}`);
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
