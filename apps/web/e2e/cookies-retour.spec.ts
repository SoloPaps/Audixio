import { expect, type Page, test } from '@playwright/test';

// Retour owner du 11 nov. : « quand on clique sur la page cookie on ne peut
// plus revenir en arrière ». /cookies cache l'en-tête et le pied et bloque le
// défilement : seul un lien vers l'accueil sortait de la boîte de dialogue.
// Désormais : croix, Échap et retour automatique après un choix ramènent
// à la page d'où l'on vient (le lien « Retour à l'accueil » reste).

async function fromFooter(page: Page, theme: string): Promise<void> {
  await page.goto(`/methode?theme=${theme}`);
  const link = page.locator('footer a[href="/cookies"]').first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/cookies$/);
  await expect(page.getByRole('dialog')).toBeVisible();
}

for (const theme of ['light', 'dark']) {
  test(`cookies (${theme}) : le bouton Retour du navigateur ramène à la page d'avant`, async ({
    page,
  }) => {
    await fromFooter(page, theme);
    await page.goBack();
    await expect(page).toHaveURL(/\/methode\?theme=/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test(`cookies (${theme}) : la croix ferme et revient à la page d'avant`, async ({
    page,
  }) => {
    await fromFooter(page, theme);
    await page
      .getByRole('button', { name: 'Fermer et revenir à la page précédente' })
      .click();
    await expect(page).toHaveURL(/\/methode\?theme=/);
  });
}

test('cookies : un choix est enregistré puis ramène à la page d’avant', async ({
  page,
}) => {
  await fromFooter(page, 'light');
  await page.getByRole('button', { name: 'Tout refuser' }).click();
  await expect(page.locator('#st')).toHaveText(
    'Refus enregistré : seuls les cookies nécessaires sont utilisés.',
  );
  await expect(page).toHaveURL(/\/methode\?theme=/, { timeout: 5000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('audixio_consent') ?? 'null'),
  );
  expect(saved?.pref).toBe(false);
});

test('cookies : Échap revient aussi à la page d’avant', async ({ page }) => {
  await fromFooter(page, 'light');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/methode\?theme=/);
});

test('cookies ouvert directement : la croix mène à l’accueil, pas dans le vide', async ({
  page,
}) => {
  await page.goto('/cookies');
  await page
    .getByRole('button', { name: 'Fermer et revenir à la page précédente' })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test('cookies EN : la croix est traduite', async ({ page }) => {
  await page.goto('/cookies');
  await page.getByRole('button', { name: 'EN — English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('button', {
      name: 'Close and go back to the previous page',
    }),
  ).toBeVisible();
});
