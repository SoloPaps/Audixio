import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

async function withFullName(page: Page, fullName: string): Promise<void> {
  // Session par cookie seulement : c’est elle qui porte le nom complet.
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        expires_in: 3600,
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'gratuit@exemple.fr',
          app_metadata: {},
          user_metadata: { full_name: fullName },
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    }),
  );
}

test('/bienvenue sans prénom : salut sans nom ni préfixe d’adresse', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  const title = page.locator('h1');
  await expect(title).toHaveText('Bienvenue sur Audixio');
  await expect(title).not.toContainText('gratuit');
  await expect(title).not.toContainText('Camille');
});

test('/bienvenue sans prénom en anglais : « Welcome to Audixio »', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await expect(page.locator('h1')).toHaveText('Welcome to Audixio');
});

test('/bienvenue avec prénom : le nom suit la virgule', async ({ page }) => {
  await withFullName(page, 'Léa');
  await page.goto('/bienvenue?theme=light');
  await expect(page.locator('h1')).toHaveText('Bienvenue sur Audixio, Léa');
});
