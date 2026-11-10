import { type LinkRecord, sha256Hex, shareTokenFromBytes } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  handleLien,
  handleSitePublic,
  type LienDeps,
  type LienStore,
} from '../src/liens-http.js';
import { captureLogger } from './helpers.js';

const USER = '33333333-3333-4333-8333-333333333333';
const AUDIT = '22222222-2222-4222-8222-222222222222';
const TOKEN_AUTH = 'jeton-de-test-0001';

function memory(plan: 'free' | 'pro', published: number, shares: number) {
  const links: LinkRecord[] = [];
  const now = new Date('2026-11-03T12:00:00.000Z');
  for (let i = 0; i < shares; i += 1) {
    links.push({
      id: `link-${i}`,
      auditId: AUDIT,
      ownerId: USER,
      kind: 'public',
      tokenHash: `hash-${i}`,
      createdAt: now.toISOString(),
      expiresAt: '2026-12-03T12:00:00.000Z',
      revokedAt: null,
      ownerVerified: true,
      avecBrief: false,
    });
  }
  const store: LienStore = {
    now: () => now,
    async planOf() {
      return plan;
    },
    async owns(userId, auditId) {
      return userId === USER && auditId === AUDIT;
    },
    async verified() {
      return true;
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
    async tokenOf() {
      return null;
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
        createdAt: now.toISOString(),
        expiresAt: input.expiresAt,
        revokedAt: null,
        ownerVerified: input.ownerVerified,
        avecBrief: input.avecBrief,
      };
      links.push(record);
      return { record, token };
    },
    async markRevoked() {},
    async byTokenHash() {
      return null;
    },
    async rapport() {
      return {
        label: 'Exemple',
        url: 'https://exemple.fr',
        finishedAt: now.toISOString(),
        methodVersion: '2026.1',
        globalScore: 72,
        globalGrade: 'C',
        auditId: AUDIT,
        domains: [],
        findings: [],
        briefPartiel: '',
        briefComplet: '',
      };
    },
    async refuse() {},
  };
  const { logger } = captureLogger();
  const deps: LienDeps = {
    logger,
    store,
    async userFromToken(token) {
      return token === TOKEN_AUTH ? USER : null;
    },
  };
  return { deps, links };
}

async function create(deps: LienDeps): Promise<Response> {
  return handleLien(
    new Request('http://127.0.0.1/api/liens', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${TOKEN_AUTH}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        auditId: AUDIT,
        kind: 'public',
        days: 7,
      }),
    }),
    deps,
  );
}

describe('M4 — quota unique publications + liens actifs', () => {
  it('un compte gratuit avec une publication reçoit un refus clair', async () => {
    const { deps, links } = memory('free', 1, 0);
    const res = await create(deps);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('user_limit');
    expect(links).toHaveLength(0);
  });

  it('un compte gratuit avec un lien de partage reçoit un refus clair', async () => {
    const { deps, links } = memory('free', 0, 1);
    const res = await create(deps);
    expect(res.status).toBe(429);
    expect(links).toHaveLength(1);
  });

  it('un compte Pro reste illimité', async () => {
    const { deps, links } = memory('pro', 4, 6);
    const res = await create(deps);
    expect(res.status).toBe(201);
    expect(links).toHaveLength(7);
  });
});

const SITE = '44444444-4444-4444-8444-444444444444';

function memoryPublish(
  plan: 'free' | 'pro',
  published: number,
  shares: number,
) {
  const box = memory(plan, published, shares);
  const publics = new Set<string>(published > 0 ? [SITE] : []);
  box.deps.store.ownsSite = async (userId, siteId) =>
    userId === USER && siteId === SITE;
  box.deps.store.setPublic = async (_user, siteId, input) => {
    if (siteId !== SITE) return 'missing';
    if (input.visible) publics.add(siteId);
    else publics.delete(siteId);
    box.deps.store.publishedSites = async () => publics.size;
    return { isPublic: input.visible, publicSlug: input.publicSlug };
  };
  return box;
}

async function publish(deps: LienDeps, visible = true): Promise<Response> {
  return handleSitePublic(
    new Request('http://127.0.0.1/api/sites/public', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${TOKEN_AUTH}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        siteId: SITE,
        visible,
        publicSlug: 'slug-public-test-01',
      }),
    }),
    deps,
  );
}

describe('M4 — publication /score soumise au même quota', () => {
  it('un compte gratuit avec un lien de partage ne peut pas publier', async () => {
    const { deps } = memoryPublish('free', 0, 1);
    const res = await publish(deps);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('user_limit');
  });

  it('un compte Pro publie malgré des liens déjà ouverts', async () => {
    const { deps } = memoryPublish('pro', 0, 6);
    const res = await publish(deps);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { visible?: boolean };
    expect(body.visible).toBe(true);
  });
});
