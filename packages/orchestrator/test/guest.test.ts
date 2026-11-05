import { SECURITE_CHECKS, SEO_CHECKS } from '@audigy/engine';
import {
  type DohResolver,
  NetError,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import {
  type ApiDeps,
  type AuditView,
  handleGuestCreate,
  runPassiveGuest,
} from '../src/index.js';
import {
  captureLogger,
  failingCheck,
  offlineContext,
  serverCheck,
} from './helpers.js';

const HTML = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"/>
<title>Atelier Bon Exemple local</title>
<meta name="description" content="Site de test local servi pour vérifier la note partielle du visiteur anonyme."/>
<link rel="canonical" href="https://exemple.fr/"/>
</head><body><h1>Atelier</h1></body></html>`;

function response(url: string, body: string, type: string): SafeResponse {
  const bytes = new TextEncoder().encode(body);
  return {
    url,
    status: 200,
    headers: new Headers({ 'content-type': type }),
    body: bytes,
    transferBytes: bytes.length,
    ip: '93.184.216.34',
    redirects: [],
    text: () => body,
  };
}

function localFetch(): SafeFetch {
  return (async (input) => {
    const url = String(input);
    if (url.endsWith('/robots.txt')) {
      return response(
        url,
        'User-agent: *\nAllow: /\n',
        'text/plain; charset=utf-8',
      );
    }
    return response(url, HTML, 'text/html; charset=utf-8');
  }) as SafeFetch;
}

function deadNet(): { dns: DohResolver; tls: TlsProbe; fetch: SafeFetch } {
  const fail = () => Promise.reject(new NetError('DNS_FAILURE', 'hors ligne'));
  return {
    fetch: (() => fail()) as SafeFetch,
    dns: { query: fail, addresses: fail },
    tls: () => fail(),
  };
}

function deps(
  guard: ApiDeps['guardGuest'],
  guestAudit?: ApiDeps['guestAudit'],
): {
  deps: ApiDeps;
  calls: number;
  runs: number;
} {
  const { logger } = captureLogger([]);
  let calls = 0;
  let runs = 0;
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
    ...(guestAudit
      ? {
          guestAudit: async (site) => {
            runs += 1;
            return guestAudit(site);
          },
        }
      : {}),
  };
  return {
    deps: api,
    get calls() {
      return calls;
    },
    get runs() {
      return runs;
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

function measured(): NonNullable<ApiDeps['guestAudit']> {
  return (site) =>
    runPassiveGuest({
      site,
      checks: [serverCheck, failingCheck],
      net: offlineContext().ctx.net,
      budget: { perHostIntervalMs: 0 },
    });
}

describe('POST /api/guest-audits', () => {
  it('accorde trois hubs puis refuse le quatrième', async () => {
    let used = 0;
    const gate = deps(async () => {
      used += 1;
      if (used <= 3) return { ok: true };
      return { ok: false, retryAfter: 3600 };
    }, measured());
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
      expect(body.view.audit.partialLabel).toBe(
        'partielle · 1 domaines · site non vérifié',
      );
      expect(
        body.view.domains.find((row) => row.domain === 'securite')?.locked,
      ).toBe(true);
      expect(
        body.view.domains.find((row) => row.domain === 'securite')?.score,
      ).toBeNull();
      expect(
        body.view.domains.find((row) => row.domain === 'seo')?.locked,
      ).toBe(false);
      expect(
        body.view.domains.find((row) => row.domain === 'seo')?.score,
      ).toBeTypeOf('number');
      expect(body.view.findings.some((row) => row.domain === 'seo')).toBe(true);
      expect(body.view.findings.every((row) => row.fixKey === null)).toBe(true);
      expect(body.view.findings.some((row) => row.domain === 'securite')).toBe(
        false,
      );
      ids.push(body.view.audit.id);
    }
    expect(new Set(ids).size).toBe(3);
    expect(gate.runs).toBe(3);
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
    expect(gate.runs).toBe(3);
  });

  it('note un site joignable et n’envoie aucun constat verrouillé', async () => {
    const dead = deadNet();
    const gate = deps(
      async () => ({ ok: true }),
      (site) =>
        runPassiveGuest({
          site,
          checks: [...SEO_CHECKS, ...SECURITE_CHECKS],
          net: { fetch: localFetch(), dns: dead.dns, tls: dead.tls },
          budget: { perHostIntervalMs: 0, maxRequests: 40 },
        }),
    );
    const res = await handleGuestCreate(post({ url: 'exemple.fr' }), gate.deps);
    expect(res.status).toBe(202);
    const body = (await res.json()) as { view: AuditView };
    expect(body.view.audit.globalScore).toBeNull();
    expect(body.view.audit.siteVerified).toBe(false);
    expect(body.view.audit.partialLabel).toMatch(
      /^partielle · [1-9]\d* domaines · site non vérifié$/,
    );
    expect(
      body.view.domains.find((row) => row.domain === 'seo')?.score,
    ).toBeTypeOf('number');
    for (const name of ['securite', 'vie_privee', 'dns_email']) {
      const row = body.view.domains.find((domain) => domain.domain === name);
      expect(row?.locked).toBe(true);
      expect(row?.score).toBeNull();
    }
    expect(
      body.view.findings.some((row) =>
        ['securite', 'vie_privee', 'dns_email'].includes(row.domain),
      ),
    ).toBe(false);
    const raw = JSON.stringify(body.view).toLowerCase();
    expect(raw).not.toContain('hsts');
    expect(raw).not.toContain('x-frame');
    expect(raw).not.toContain('strict-transport');
    expect(raw).not.toContain('content-security-policy');
  });

  it('laisse un site injoignable sans aucune note', async () => {
    const gate = deps(
      async () => ({ ok: true }),
      (site) =>
        runPassiveGuest({
          site,
          checks: [...SEO_CHECKS, ...SECURITE_CHECKS],
          net: deadNet(),
          budget: { perHostIntervalMs: 0 },
        }),
    );
    const res = await handleGuestCreate(
      post({ url: 'injoignable-audixio.fr' }),
      gate.deps,
    );
    expect(res.status).toBe(202);
    const body = (await res.json()) as { view: AuditView };
    expect(body.view.audit.status).toBe('done');
    expect(body.view.audit.globalScore).toBeNull();
    expect(body.view.audit.partialLabel).toBeNull();
    expect(body.view.domains.some((row) => typeof row.score === 'number')).toBe(
      false,
    );
    expect(
      body.view.findings.some((row) =>
        ['securite', 'vie_privee', 'dns_email'].includes(row.domain),
      ),
    ).toBe(false);
    const raw = JSON.stringify(body.view).toLowerCase();
    expect(raw).not.toContain('hsts');
    expect(raw).not.toContain('x-frame');
    expect(gate.runs).toBe(1);
  });

  it('ne consomme pas le plafond si l’adresse est refusée', async () => {
    const gate = deps(async () => ({ ok: true }), measured());
    const res = await handleGuestCreate(
      post({ url: 'http://127.0.0.1' }),
      gate.deps,
    );
    expect(res.status).toBe(400);
    expect(gate.calls).toBe(0);
    expect(gate.runs).toBe(0);
  });

  it('refuse un corps inattendu sans jeton', async () => {
    const gate = deps(async () => ({ ok: true }), measured());
    expect(
      (await handleGuestCreate(post({ url: 'a.fr', admin: true }), gate.deps))
        .status,
    ).toBe(400);
    expect((await handleGuestCreate(post('non'), gate.deps)).status).toBe(400);
    const get = new Request('http://127.0.0.1/api/guest-audits');
    const res = await handleGuestCreate(get, gate.deps);
    expect(res.status).toBe(405);
    expect(gate.calls).toBe(0);
    expect(gate.runs).toBe(0);
  });

  it('refuse de répondre sans moteur', async () => {
    const gate = deps(async () => ({ ok: true }));
    const res = await handleGuestCreate(post({ url: 'exemple.fr' }), gate.deps);
    expect(res.status).toBe(500);
    expect(gate.calls).toBe(0);
    expect(gate.runs).toBe(0);
  });
});
