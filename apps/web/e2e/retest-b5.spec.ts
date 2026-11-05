import { expect, test } from '@playwright/test';

// B5 (retest nuit) : sans identifiant, /score et /partage ont un vrai titre
// (pas le titre d’onglet « — Audixio ») et /partage n’annonce pas un lien mort.
test('B5 /score sans id : h1 explicite, sans suffixe d’onglet', async ({
  page,
}) => {
  await page.goto('/score');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText('Ce score n’est pas publié', {
    timeout: 15_000,
  });
  await expect(h1).not.toContainText('Audixio');
});

test('B5 /partage sans id : pas de bandeau ni de « lien mort »', async ({
  page,
}) => {
  await page.goto('/partage');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText('Aucun lien de partage', { timeout: 15_000 });
  await expect(h1).not.toContainText('Audixio');
  await expect(page.locator('.share-banner')).toHaveCount(0);
  await expect(page.getByText('Ce lien ne fonctionne plus.')).toHaveCount(0);
  await expect(
    page.getByText('Ouvrez le lien complet reçu de votre équipe.'),
  ).toBeVisible();
});
