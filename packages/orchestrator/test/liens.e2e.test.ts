import { once } from 'node:events';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import {
  type LienRapport,
  type LinkRecord,
  sha256Hex,
  shareTokenFromBytes,
} from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  handleLien,
  handlePartage,
  type LienDeps,
  type LienStore,
} from '../src/liens-http.js';
import { captureLogger } from './helpers.js';

const USER = '33333333-3333-4333-8333-333333333333';
const AUDIT = '22222222-2222-4222-8222-222222222222';
const SECRET = 'mesure-secrete-hsts';
const BRIEF = 'Audixio Brief — COMPLET secret-brief';
const TOKEN_AUTH = 'jeton-de-test-0001';

function rapport(): LienRapport {
  return {
    label: 'Exemple',
    url: 'https://exemple.fr',
    finishedAt: '2026-11-01T08:00:00.000Z',
    methodVersion: '2026.1',
    globalScore: 72,
    globalGrade: 'C',
    auditId: AUDIT,
    domains: [
      { domain: 'seo', score: 80, grade: 'B', level: 'good' },
      { domain: 'securite', score: 40, grade: 'E', level: 'problem' },
    ],
    findings: [
      {
        domain: 'seo',
        checkId: 'seo.titre',
        status: 'fail',
        severity: 2,
        messageKey: 'finding.seo.titre',
        measured: 'titre',
        fixKey: 'fix.seo.titre',
      },
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        messageKey: 'finding.securite.hsts',
        measured: SECRET,
        fixKey: 'fix.securite.hsts',
      },
    ],
    briefPartiel: 'Audixio Brief — PARTIEL',
    briefComplet: BRIEF,
  };
}

function memory(plan: 'free' | 'pro', verified = true) {
  const links: LinkRecord[] = [];
  const tokens = new Map<string, string>();
  const refusals: string[] = [];
  let clock = Date.parse('2026-11-03T12:00:00.000Z');
  let published = 0;
  const store: LienStore = {
    now: () => new Date(clock),
    async planOf() {
      return plan;
    },
    async owns(userId, auditId) {
      return userId === USER && auditId === AUDIT;
    },
    async verified() {
      return verified;
    },
    async publishedSites() {
      return published;
    },
    async ownsSite() {
      return false;
    },
    async setPublic() {
      return 'missing';
    },
    async linksOf(userId) {
      return links.filter((row) => row.ownerId === userId);
    },
    async tokenOf(hash) {
      return tokens.get(hash) ?? null;
    },
    async mint(input) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const token = shareTokenFromBytes(bytes);
      const tokenHash = await sha256Hex(token);
      const record: LinkRecord = {
        id: crypto.randomUUID(),
        auditId: input.auditId,
        ownerId: input.ownerId,
        kind: input.kind,
        tokenHash,
        createdAt: new Date(clock).toISOString(),
        expiresAt: input.expiresAt,
        revokedAt: null,
        ownerVerified: input.ownerVerified,
        avecBrief: input.avecBrief,
      };
      links.push(record);
      tokens.set(tokenHash, token);
      return { record, token };
    },
    async markRevoked(link, at) {
      link.revokedAt = at;
    },
    async byTokenHash(hash) {
      return links.find((row) => row.tokenHash === hash) ?? null;
    },
    async rapport() {
      return rapport();
    },
    async refuse(entry) {
      refusals.push(entry.requestId);
    },
  };
  return {
    store,
    links,
    refusals,
    setPublished(count: number) {
      published = count;
    },
    setNow(iso: string) {
      clock = Date.parse(iso);
    },
  };
}

function deps(box: ReturnType<typeof memory>): {
  deps: LienDeps;
  lines: string[];
} {
  const { logger, lines } = captureLogger();
  return {
    lines,
    deps: {
      logger,
      store: box.store,
      async userFromToken(token) {
        return token === TOKEN_AUTH ? USER : null;
      },
    },
  };
}

async function listen(
  handlers: LienDeps,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(async (incoming, outgoing) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const url = `http://127.0.0.1${incoming.url ?? '/'}`;
    const request = new Request(url, {
      method: incoming.method ?? 'GET',
      headers: headersOf(incoming.headers),
      ...(body.length > 0 ? { body } : {}),
    });
    const response = (incoming.url ?? '').startsWith('/api/partage')
      ? await handlePartage(request, handlers)
      : await handleLien(request, handlers);
    const payload = Buffer.from(await response.arrayBuffer());
    outgoing.writeHead(response.status, {
      'content-type': 'application/json; charset=utf-8',
    });
    outgoing.end(payload);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function headersOf(raw: IncomingHttpHeaders): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value.join(', ');
  }
  return headers;
}

function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${TOKEN_AUTH}`,
    'content-type': 'application/json',
  };
}

function tokenOf(url: string): string {
  return url.slice('/partage/'.length);
}

describe('liens HTTP', () => {
  it('refuse la création sans session et n’écrit rien', async () => {
    const box = memory('free');
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const res = await fetch(`${server.url}/api/liens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ auditId: AUDIT, kind: 'public' }),
      });
      expect(res.status).toBe(401);
      expect(box.links).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it('crée un lien public, le ferme à la révocation et masque le jeton', async () => {
    const box = memory('free', true);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const created = await fetch(`${server.url}/api/liens`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ auditId: AUDIT, kind: 'public' }),
      });
      expect(created.status).toBe(201);
      const body = (await created.json()) as { url: string; expiresAt: string };
      expect(body.url).toMatch(/^\/partage\/[0-9a-f]{32}$/);
      expect(body.url).not.toContain(AUDIT.replaceAll('-', ''));
      expect(body.expiresAt).toBe('2026-12-03T12:00:00.000Z');
      const token = tokenOf(body.url);
      const journal = wired.lines.join('\n');
      expect(journal).not.toContain(token);
      expect(journal).toContain('lien_cree');
      const open = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      expect(open.status).toBe(200);
      const vue = await open.text();
      expect(vue).not.toContain(SECRET);
      expect(vue).not.toContain('securite.hsts');
      expect(vue).not.toContain(BRIEF);
      expect(vue).not.toContain('fix.seo');
      expect(vue).toContain('"access":"public"');
      expect(vue).toContain('"brief":"aucun"');

      const again = await fetch(`${server.url}/api/liens`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ auditId: AUDIT, kind: 'public' }),
      });
      expect(again.status).toBe(429);

      const revoked = await fetch(`${server.url}/api/liens`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: box.links[0]?.id }),
      });
      expect(revoked.status).toBe(200);
      const after = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      expect(after.status).toBe(404);
      expect(await after.text()).not.toContain(SECRET);
      expect(wired.lines.join('\n')).not.toContain(token);
    } finally {
      await server.close();
    }
  });

  it('ferme un lien public expiré sans rien renvoyer', async () => {
    const box = memory('pro', true);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const created = await fetch(`${server.url}/api/liens`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ auditId: AUDIT, kind: 'public' }),
      });
      const body = (await created.json()) as { url: string };
      const token = tokenOf(body.url);
      box.setNow('2026-12-03T12:00:00.000Z');
      const res = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      expect(res.status).toBe(404);
      expect(await res.text()).not.toContain(SECRET);
      expect(box.links[0]?.revokedAt).toBe('2026-12-03T12:00:00.000Z');
    } finally {
      await server.close();
    }
  });

  it('un refus ne crée pas de lien', async () => {
    const box = memory('free', true);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const res = await fetch(`${server.url}/api/liens/decision`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          auditId: AUDIT,
          requestId: 'req_948f2a1b7e',
          decision: 'refuse',
          role: 'rapport-brief',
          days: 30,
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, decision: 'refuse' });
      expect(box.links).toEqual([]);
      expect(box.refusals).toEqual(['req_948f2a1b7e']);
    } finally {
      await server.close();
    }
  });

  it('un rôle inconnu est refusé', async () => {
    const box = memory('free', true);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const res = await fetch(`${server.url}/api/liens/decision`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          auditId: AUDIT,
          requestId: 'req_1',
          decision: 'accept',
          role: 'admin',
          days: 30,
        }),
      });
      expect(res.status).toBe(400);
      expect(box.links).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it('le lien équipe vérifié donne le détail, puis plus rien de sensible', async () => {
    const box = memory('free', true);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const created = await fetch(`${server.url}/api/liens/decision`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          auditId: AUDIT,
          requestId: 'req_ok',
          decision: 'accept',
          role: 'rapport-brief',
          days: 30,
        }),
      });
      expect(created.status).toBe(201);
      const body = (await created.json()) as { url: string; kind: string };
      expect(body.kind).toBe('team');
      const token = tokenOf(body.url);
      expect(wired.lines.join('\n')).not.toContain(token);
      const open = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const vue = await open.text();
      expect(open.status).toBe(200);
      expect(vue).toContain(SECRET);
      expect(vue).toContain(BRIEF);
      expect(vue).toContain('"access":"team"');
      const revoked = await fetch(`${server.url}/api/liens`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: box.links[0]?.id }),
      });
      expect(revoked.status).toBe(200);
      const after = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const limited = await after.text();
      expect(after.status).toBe(200);
      expect(limited).toContain('"access":"retired"');
      expect(limited).not.toContain(SECRET);
      expect(limited).not.toContain(BRIEF);
      expect(limited).not.toContain('securite.hsts');
    } finally {
      await server.close();
    }
  });

  it('sans preuve, le lien équipe ne sort pas le secret', async () => {
    const box = memory('pro', false);
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const created = await fetch(`${server.url}/api/liens/decision`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          auditId: AUDIT,
          requestId: 'req_ouvert',
          decision: 'accept',
          role: 'rapport-brief',
          days: 7,
        }),
      });
      const body = (await created.json()) as { url: string };
      const token = tokenOf(body.url);
      const res = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const vue = await res.text();
      expect(vue).not.toContain(SECRET);
      expect(vue).not.toContain(BRIEF);
      expect(vue).toContain('"brief":"partiel"');
    } finally {
      await server.close();
    }
  });

  it('un jeton illisible ne ressort pas dans la réponse', async () => {
    const box = memory('free');
    const wired = deps(box);
    const server = await listen(wired.deps);
    try {
      const res = await fetch(`${server.url}/api/partage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'pas-un-jeton-clair' }),
      });
      expect(res.status).toBe(404);
      expect(await res.text()).not.toContain('pas-un-jeton-clair');
    } finally {
      await server.close();
    }
  });
});
