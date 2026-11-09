import { expect, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

// Décision owner du 6 nov. 17:12 : un compte Pro voit /pro avec « déjà Pro »
// et le lien vers /compte, plus le formulaire de liste d’attente.

for (const theme of ['light', 'dark'] as const) {
  test(`/pro, compte Pro : « Vous êtes déjà Pro » et lien vers /compte (${theme})`, async ({
    page,
  }) => {
    await stubSession(page, 'pro');
    await page.goto(`/pro?theme=${theme}`);
    const deja = page.locator('#deja-pro');
    await expect(deja).toBeVisible({ timeout: 15_000 });
    await expect(deja).toContainText('Vous êtes déjà Pro.');
    await expect(
      deja.getByRole('link', { name: 'Aller à mon compte' }),
    ).toHaveAttribute('href', '/compte');
    await expect(page.locator('#waitlist-form')).toBeHidden();
    expect(new URL(page.url()).pathname).toBe('/pro');
    // Bouton et pastille gardent un fond, en clair comme en sombre.
    for (const node of ['a.pbtn', '.okc']) {
      const bg = await deja
        .locator(node)
        .evaluate(
          (el) =>
            (globalThis as unknown as View).getComputedStyle(el)
              .backgroundColor,
        );
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
}

test('/pro, compte Pro en anglais', async ({ page }) => {
  await stubSession(page, 'pro');
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await page.goto('/pro?theme=light');
  const deja = page.locator('#deja-pro');
  await expect(deja).toBeVisible({ timeout: 15_000 });
  await expect(deja).toContainText('You are already Pro.');
  await expect(deja).toContainText(
    'Your plan and your access are managed from your account.',
  );
  await expect(
    deja.getByRole('link', { name: 'Go to my account' }),
  ).toHaveAttribute('href', '/compte');
});

test('/pro, compte gratuit : liste d’attente, pas de « déjà Pro »', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await page.goto('/pro?theme=light');
  await expect(page.locator('#waitlist-form')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#deja-pro')).toBeHidden();
});

test('/pro, visiteur : liste d’attente, pas de « déjà Pro »', async ({
  page,
}) => {
  await page.goto('/pro?theme=light');
  await expect(page.locator('#waitlist-form')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#deja-pro')).toBeHidden();
});
