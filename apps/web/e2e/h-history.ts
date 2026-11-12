import type { Page } from '@playwright/test';
import { ORIGIN } from './origin.js';

// Historique simulé d’un site : audits de janvier et mai 2026.
const SITE = '00000000-0000-4000-8000-0000000000bb';
const FIRST = '00000000-0000-4000-8000-0000000000c1';
const SECOND = '00000000-0000-4000-8000-0000000000c2';
const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ada@exemple.fr',
  },
};

export async function openHistory(
  page: Page,
  scores: readonly [number | null, number | null] | readonly [number],
  theme: 'light' | 'dark' = 'light',
  host = 'bon.audigy.test',
  plan: 'free' | 'pro' = 'free',
): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: 3600,
        user: {
          id: session.user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: session.user.email,
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-10-23T00:00:00.000Z',
        },
      }),
    });
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? ORIGIN;
    const headers = {
      'access-control-allow-origin': origin,
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
    if (url.includes('/rest/v1/audits')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(
          [
            {
              id: FIRST,
              status: 'done',
              created_at: '2026-01-15T10:00:00.000Z',
              finished_at: '2026-01-15T10:05:00.000Z',
            },
            {
              id: SECOND,
              status: 'done',
              created_at: '2026-05-15T10:00:00.000Z',
              finished_at: '2026-05-15T10:05:00.000Z',
            },
          ].slice(0, scores.length),
        ),
      });
      return;
    }
    if (url.includes('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify([{ id: SITE, host, hosting: 'other' }]),
      });
      return;
    }
    if (url.includes('/rest/v1/profiles')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ plan }),
      });
      return;
    }
    if (url.includes('read_rapport_apercu')) {
      const raw = request.postData() ?? '';
      const score = raw.includes(SECOND) ? (scores[1] ?? null) : scores[0];
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ score_global: score }),
      });
      return;
    }
    if (url.includes('domain_scores') || url.includes('findings')) {
      await route.fulfill({ status: 200, headers, body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, headers, body: 'null' });
  });

  await page.goto(`/historique?site=${SITE}&theme=${theme}`);
}
