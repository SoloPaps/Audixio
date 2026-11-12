import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';
import { stubSession } from './session-stub.js';

// Retest C2 : /historique avec un site inconnu, d’un autre compte ou mal
// formé renvoie vers /sites au lieu d’afficher la démo « monsite-exemple.fr ».

const MINE = '00000000-0000-4000-8000-0000000000a2';
const OTHER = '00000000-0000-4000-8000-0000000000b2';
const UNKNOWN = '00000000-0000-4000-8000-0000000000ff';

async function signedIn(page: Page): Promise<void> {
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
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? ORIGIN;
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    if (url.pathname.endsWith('/rest/v1/sites')) {
      const id = url.searchParams.get('id');
      const mine = [
        { id: MINE, host: 'gratuit.audigy.test', hosting: 'other' },
      ];
      // Le filtre owner_id fait le tri : un site d’un autre compte est absent.
      const body = id && id !== `eq.${MINE}` ? [] : mine;
      await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan: 'free' }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '[]' });
  });
}

for (const site of [OTHER, UNKNOWN, 'zzz']) {
  test(`C2 /historique?site=${site} renvoie vers /sites`, async ({ page }) => {
    await signedIn(page);
    await page.goto(`/historique?site=${site}`);
    await page.waitForURL(/\/sites\/?(\?.*)?$/u, { timeout: 15_000 });
    await expect(page.getByText('monsite-exemple.fr')).toHaveCount(0);
  });
}

test('C2 /historique?site=<site du compte> ouvre l’historique de ce site', async ({
  page,
}) => {
  // R11 (lot 4) : /sites/id/:site puis /sites/:host#historique, sans repasser par /sites.
  await signedIn(page);
  await page.goto(`/historique?site=${MINE}`);
  await page.waitForURL(/\/sites\/[^/]+#historique$/u, { timeout: 15_000 });
  await page.waitForTimeout(2_000);
  expect(new URL(page.url()).pathname).toMatch(/^\/sites\/[^/]+$/u);
});
