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
