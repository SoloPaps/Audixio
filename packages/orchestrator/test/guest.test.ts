import { describe, expect, it } from 'vitest';
import {
  type ApiDeps,
  type AuditView,
  handleGuestCreate,
} from '../src/index.js';
import { captureLogger } from './helpers.js';

function deps(guard: ApiDeps['guardGuest']): {
  deps: ApiDeps;
  calls: number;
} {
  const { logger } = captureLogger([]);
  let calls = 0;
  const api: ApiDeps = {
    logger,
    userFromToken: async () => {
      throw new Error('pas de compte');
    },
    createDeps: () => {
      throw new Error('pas de compte');
    },
    readAudit: async () => null,
    guardGuest: async (req) => {
      calls += 1;
      if (!guard) return { ok: false, retryAfter: 1 };
      return guard(req);
    },
  };
  return {
    deps: api,
    get calls() {
      return calls;
    },
  };
}

function post(body: unknown): Request {
  return new Request('http://127.0.0.1/api/guest-audits', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nf-client-connection-ip': '203.0.113.40',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/guest-audits', () => {
  it('accorde trois hubs puis refuse le quatrième', async () => {
    let used = 0;
    const gate = deps(async () => {
      used += 1;
      if (used <= 3) return { ok: true };
      return { ok: false, retryAfter: 3600 };
    });
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await handleGuestCreate(
        post({ url: 'exemple.fr' }),
        gate.deps,
      );
      expect(res.status).toBe(202);
      const body = (await res.json()) as { view: AuditView };
      expect(body.view.audit.globalScore).toBeNull();
      expect(body.view.audit.siteVerified).toBe(false);
      expect(body.view.findings).toEqual([]);
      expect(
        body.view.domains.find((row) => row.domain === 'securite')?.locked,
      ).toBe(true);
      expect(
        body.view.domains.find((row) => row.domain === 'seo')?.locked,
      ).toBe(false);
      ids.push(body.view.audit.id);
    }
    expect(new Set(ids).size).toBe(3);
    const denied = await handleGuestCreate(
      post({ url: 'exemple.fr' }),
      gate.deps,
    );
    expect(denied.status).toBe(429);
    expect(denied.headers.get('retry-after')).toBe('3600');
    expect(await denied.json()).toEqual({
      error: 'guest_limit',
      messageKey: 'api.error.guest_limit',
      retryAfter: 3600,
    });
    expect(gate.calls).toBe(4);
  });

  it('ne consomme pas le plafond si l’adresse est refusée', async () => {
    const gate = deps(async () => ({ ok: true }));
    const res = await handleGuestCreate(
      post({ url: 'http://127.0.0.1' }),
      gate.deps,
    );
    expect(res.status).toBe(400);
    expect(gate.calls).toBe(0);
  });

  it('refuse un corps inattendu sans jeton', async () => {
    const gate = deps(async () => ({ ok: true }));
    expect(
      (await handleGuestCreate(post({ url: 'a.fr', admin: true }), gate.deps))
        .status,
    ).toBe(400);
    expect((await handleGuestCreate(post('non'), gate.deps)).status).toBe(400);
    const get = new Request('http://127.0.0.1/api/guest-audits');
    const res = await handleGuestCreate(get, gate.deps);
    expect(res.status).toBe(405);
    expect(gate.calls).toBe(0);
  });
});
