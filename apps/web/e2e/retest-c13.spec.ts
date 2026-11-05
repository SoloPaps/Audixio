import { expect, test } from '@playwright/test';
import { stubSession } from './session-stub.js';

// Retest C13 : sans `id`, /badge et /constat gardent un titre propre à la
// page (plus « Rapport ») et invitent à choisir un site ou un rapport.

test('/constat sans id : titre du constat et invitation à choisir', async ({
  page,
}) => {
  await page.goto('/constat');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Détail du constat', { timeout: 15_000 });
  await expect(heading).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText(
    'Choisissez un site ou un rapport',
  );
  await expect(page.getByText('Ce rapport est introuvable')).toHaveCount(0);
});

test('/badge sans id (connecté) : titre du badge et invitation à choisir', async ({
  page,
}) => {
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
  await page.goto('/badge');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Badge de note', { timeout: 15_000 });
  await expect(heading).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText(
    'Choisissez un site ou un rapport',
  );
  await expect(page.getByText('Ce rapport est introuvable')).toHaveCount(0);
});
