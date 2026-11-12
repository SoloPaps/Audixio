import type { Page } from '@playwright/test';
import { ORIGIN } from './origin.js';

/**
 * Compte de test simulé (aucun vrai compte) : un site suivi et trois audits
 * terminés, pour la page d’un site et le compte en sections.
 */
export const SITE_ID = '00000000-0000-4000-8000-0000000000bb';
export const SITE_HOST = 'bon.audigy.test';
export const AUDITS = [
  ['00000000-0000-4000-8000-0000000000c1', '2026-01-15T10:05:00.000Z', 58],
  ['00000000-0000-4000-8000-0000000000c2', '2026-05-15T10:05:00.000Z', 71],
  ['00000000-0000-4000-8000-0000000000c3', '2026-10-02T10:05:00.000Z', 83],
] as const;
const USER = '11111111-1111-4111-8111-111111111111';

export async function stubSiteAccount(
  page: Page,
  options: { plan?: 'free' | 'pro'; sites?: boolean } = {},
): Promise<void> {
  const plan = options.plan ?? 'pro';
  const withSite = options.sites ?? true;
  const session = {
    access_token: 'header.payload.signature',
    expires_at: 2_000_000_000,
    user: { id: USER, email: 'test@exemple.fr' },
  };
  await page.addInitScript((value) => {
    localStorage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: 3600,
        user: {
          id: USER,
          aud: 'authenticated',
          role: 'authenticated',
          email: session.user.email,
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    }),
  );
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? ORIGIN,
      'access-control-allow-headers': '*',
      // Joker CORS (pas de cookies) : aucune liste de méthodes.
      'access-control-allow-methods': '*',
      'content-type': 'application/json',
    };
    if (request.method().toLowerCase() === 'options') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
    if (url.includes('/rest/v1/audits')) {
      await json(
        withSite
          ? AUDITS.map(([id, at]) => ({
              id,
              status: 'done',
              created_at: at,
              finished_at: at,
              site_id: SITE_ID,
              url: `https://${SITE_HOST}/`,
            }))
          : [],
      );
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await json(
        withSite
          ? [
              {
                id: SITE_ID,
                host: SITE_HOST,
                hosting: 'other',
                url: `https://${SITE_HOST}/`,
                label: 'Bon',
                is_public: false,
                public_slug: null,
                expose_security: false,
                scope: 'origin',
                path_prefix: null,
                created_at: '2026-01-10T00:00:00.000Z',
              },
            ]
          : [],
      );
      return;
    }
    if (url.includes('/rest/v1/profiles')) {
      await json({ plan, email: session.user.email });
      return;
    }
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const audit = AUDITS.find(([id]) => raw.includes(id));
      await json({ score_global: audit ? audit[2] : null });
      return;
    }
    await json([]);
  });
}
