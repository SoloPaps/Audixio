import { afterEach, describe, expect, it, vi } from 'vitest';

const etat = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  plan: 'free' as string,
}));

vi.mock('./browser-session.js', () => ({
  currentSession: async () => etat.session,
  browserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { plan: etat.plan } }),
        }),
      }),
    }),
  }),
}));

import { routeUpgrade } from './pro-redirect.js';

afterEach(() => {
  etat.session = null;
  etat.plan = 'free';
});

describe('routeUpgrade (C1)', () => {
  it('envoie un compte Pro lu par le cookie vers /compte', async () => {
    etat.session = { user: { id: '00000000-0000-4000-8000-0000000000b1' } };
    etat.plan = 'pro';
    const go = vi.fn();
    await routeUpgrade(go, '?from=sites#offre');
    expect(go).toHaveBeenCalledWith('/compte');
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('envoie un compte gratuit vers /pro avec la requête', async () => {
    etat.session = { user: { id: '00000000-0000-4000-8000-0000000000a1' } };
    const go = vi.fn();
    await routeUpgrade(go, '?from=sites#offre');
    expect(go).toHaveBeenCalledWith('/pro?from=sites#offre');
  });

  it('envoie un visiteur vers /pro', async () => {
    const go = vi.fn();
    await routeUpgrade(go);
    expect(go).toHaveBeenCalledWith('/pro');
  });
});
