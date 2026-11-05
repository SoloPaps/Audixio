import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

// Retest C6 : l’audit d’un autre compte (le serveur répond 400 ou 404)
// affiche « Rapport introuvable ou réservé à son propriétaire. » partout.

const OTHER = '00000000-0000-4000-8000-0000000000b5';
const UNAVAILABLE = 'Rapport introuvable ou réservé à son propriétaire.';

async function signedIn(page: Page, status: number): Promise<void> {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem(
      'audigy-auth',
      JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        user: {
          id: '00000000-0000-4000-8000-0000000000a1',
          email: 'gratuit@exemple.fr',
        },
      }),
    );
  });
  await stubSession(page);
  await page.route('**/api/audits/**', async (route) => {
    const error = status === 400 ? 'invalid_input' : 'audit_not_found';
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error, messageKey: `api.error.${error}` }),
    });
  });
}

const PAGES = [
  `/rapport?id=${OTHER}`,
  `/plan?id=${OTHER}`,
  `/brief?id=${OTHER}`,
  `/domaine?id=${OTHER}&domaine=securite`,
  `/rapport/imprimer/?id=${OTHER}`,
];

for (const status of [400, 404]) {
  for (const path of PAGES) {
    test(`C6 ${status} ${path}`, async ({ page }) => {
      await signedIn(page, status);
      await page.goto(path);
      await expect(page.getByText(UNAVAILABLE)).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('La demande est incomplète')).toHaveCount(0);
    });
  }
}
