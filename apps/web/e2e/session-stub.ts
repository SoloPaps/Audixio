import type { Page } from '@playwright/test';

/** Simule une session connectée (gratuit) pour les pages réservées. */
export async function stubSession(page: Page): Promise<void> {
  const user = {
    id: '00000000-0000-4000-8000-0000000000a1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'gratuit@exemple.fr',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  };
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'header.payload.signature',
        expires_at: 2_000_000_000,
        expires_in: 3600,
        user,
      }),
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}
