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
  for (let index = 0; index < 3; index += 1) {
    await launch(page);
    await expect(page).toHaveURL(/\/rapport\?id=/, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { level: 1, name: 'Audit de exemple.fr' }),
    ).toBeVisible();
    await expect(
      page.getByText(/partielle · \d+ domaines · site non vérifié/),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Verrouillé').first()).toBeVisible();
  }

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
  await expect(page).toHaveURL(/\/lancer/);
  const wide = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(wide.violations, JSON.stringify(wide.violations, null, 2)).toEqual([]);
  await page.screenshot({
    path: '/opt/cursor/artifacts/guest-gate-desktop.png',
    fullPage: false,
  });
});
