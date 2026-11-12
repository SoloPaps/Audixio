import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('l’accueil montre l’exemple avant de demander l’adresse', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Ce que votre site cache, révélé en quelques minutes.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Audixio passe votre site au scanner. Vous obtenez une note de A à F et la liste de ce qu’il faut corriger d’abord, en français simple.',
    ),
  ).toBeVisible();
  const address = page.getByLabel('Adresse du site à scanner');
  await expect(address).toHaveAttribute('type', 'text');
  await expect(address).toHaveAttribute('inputmode', 'url');
  await expect(
    page.getByRole('button', { name: 'Scanner mon site, gratuit' }),
  ).toBeVisible();
  // L’exemple simulé est nommé comme tel, avec sa note.
  const scan = page.locator('#top .scanner');
  await expect(scan.getByText('Simulé', { exact: true })).toBeVisible();
  await expect(scan.locator('[data-ringl]')).toHaveText('C');
  await expect(scan.locator('[data-ringn2]')).toHaveText('67');
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Trois étapes, quelques minutes.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: '8 contrôles sur votre site.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Commencez sans compte.' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', {
        name: 'Comment ça marche',
      }),
  ).toHaveAttribute('href', '/methode');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('une adresse incomplète reste sur l’accueil', async ({ page }) => {
  await page.goto('/');
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
  await page.getByLabel('Adresse du site à scanner').fill('not a url');
  await page.getByRole('button', { name: 'Scanner mon site, gratuit' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/Indiquez une adresse complète/)).toBeVisible();
});

test('l’accueil ne défile pas en large à 320, 768 et 1280', async ({
  page,
}) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(() => {
      const root = globalThis as unknown as {
        document: {
          documentElement: { scrollWidth: number; clientWidth: number };
        };
      };
      return (
        root.document.documentElement.scrollWidth >
        root.document.documentElement.clientWidth + 1
      );
    });
    expect(overflow).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.locator('.blob-lilac')).toBeHidden();
});
