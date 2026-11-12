import type { Page } from '@playwright/test';
import { ORIGIN } from './origin.js';

/**
 * Compte gratuit connecté avec deux sites suivis : la fenêtre Pro de /sites
 * (ex-contenu de /passer-pro, qui renvoie désormais vers /pro).
 */
const USER_ID = '11111111-1111-4111-8111-111111111111';
const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const SITES = [
  {
    id: '00000000-0000-4000-8000-0000000000bb',
    url: 'https://monsite-exemple.fr',
    label: 'monsite-exemple.fr',
    host: 'monsite-exemple.fr',
    owner_id: USER_ID,
    is_public: true,
    public_slug: 'exemple',
    expose_security: false,
  },
  {
    id: '00000000-0000-4000-8000-0000000000cc',
    url: 'https://boutique.exemple.fr',
    label: 'boutique.exemple.fr',
    host: 'boutique.exemple.fr',
    owner_id: USER_ID,
    is_public: false,
    public_slug: null,
    expose_security: false,
  },
];

export async function stubFreeSites(page: Page): Promise<void> {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        user: session.user,
      }),
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  await page.route('**/api/places', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    if (route.request().method().toLowerCase() === 'options') {
      await route.fulfill({ status: 204 });
      return;
    }
    const url = route.request().url();
    let body = url.includes('/rpc/') ? 'null' : '[]';
    if (url.includes('/rest/v1/profiles'))
      body = JSON.stringify({ plan: 'free' });
    else if (url.includes('/rest/v1/sites')) body = JSON.stringify(SITES);
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.addInitScript((stored) => {
    const view = globalThis as unknown as {
      localStorage: { setItem: (key: string, value: string) => void };
    };
    view.localStorage.setItem('audigy-auth', JSON.stringify(stored));
  }, session);
  await page
    .context()
    .addCookies([{ name: 'audixio_connecte', value: '1', url: ORIGIN }]);
}

/** Ouvre la fenêtre Pro de /sites sur le plafond voulu. */
export async function openProModal(
  page: Page,
  kind: 'sites' | 'liens',
): Promise<void> {
  if (kind === 'liens') {
    await page.locator('[data-pro="liens"]').first().click();
  } else {
    /* Plafond sites : ajouter un 3e site ouvre la fenêtre Pro. */
    await page.locator('#url').fill('https://troisieme.exemple.fr');
    await page.locator('#addf').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
  }
  await page.waitForSelector('#pro-modal.on');
}
