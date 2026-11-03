import { INTAKE, type RateBudget } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  handleAccessRequest,
  handleRobotOptOut,
  type IntakeDeps,
  type IntakeRecord,
} from '../src/index.js';
import { branchedFixKey, gateFallback } from '../src/supabase.js';
import { captureLogger } from './helpers.js';

function memory() {
  const counts = new Map<string, number>();
  const stored: IntakeRecord[] = [];
  let failStore = false;
  const { logger } = captureLogger([]);
  const deps: IntakeDeps = {
    logger,
    now: () => Date.parse('2026-11-03T03:00:00.000Z'),
    userId: async () => null,
    async take(budget: RateBudget) {
      const key = `${budget.scope}\n${budget.material}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next <= budget.limit;
    },
    async record(entry) {
      if (failStore) throw new Error('store');
      stored.push(entry);
    },
  };
  return {
    deps,
    stored,
    counts,
    fail() {
      failStore = true;
    },
  };
}

function post(path: string, body: unknown, ip = '203.0.113.8'): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('demande d’accès', () => {
  it('accepte une demande normale', async () => {
    const box = memory();
    const res = await handleAccessRequest(
      post('/api/demandes-acces', {
        email: 'Ada@Exemple.fr',
        message: 'Bonjour',
      }),
      box.deps,
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({
      ok: true,
      messageKey: 'api.intake.accepted',
    });
    expect(box.stored[0]).toMatchObject({
      action: 'access_request',
      actor: null,
      details: { email: 'ada@exemple.fr', message: 'Bonjour' },
    });
    expect(JSON.stringify(box.stored)).not.toContain('203.0.113.8');
  });

  it('refuse au-delà du plafond e-mail', async () => {
    const box = memory();
    let status = 0;
    for (let i = 0; i < INTAKE.access.account.limit + 1; i += 1) {
      const res = await handleAccessRequest(
        post(
          '/api/demandes-acces',
          { email: 'ada@exemple.fr', message: 'encore' },
          `198.51.100.${i + 1}`,
        ),
        box.deps,
      );
      status = res.status;
    }
    expect(status).toBe(429);
    expect(box.stored).toHaveLength(INTAKE.access.account.limit);
  });

  it('refuse au-delà du plafond IP', async () => {
    const box = memory();
    let body: { error?: string } = {};
    for (let i = 0; i < INTAKE.access.ip.limit + 1; i += 1) {
      const res = await handleAccessRequest(
        post('/api/demandes-acces', { email: `ada${i}@exemple.fr` }),
        box.deps,
      );
      body = (await res.json()) as { error?: string };
    }
    expect(body.error).toBe('rate_limited');
  });

  it('n’enregistre pas une adresse invalide', async () => {
    const box = memory();
    const res = await handleAccessRequest(
      post('/api/demandes-acces', { email: 'pas-un-mail' }),
      box.deps,
    );
    expect(res.status).toBe(400);
    expect(box.stored).toEqual([]);
  });

  it('répond indisponible si l’enregistrement échoue', async () => {
    const box = memory();
    box.fail();
    const res = await handleAccessRequest(
      post('/api/demandes-acces', { email: 'ada@exemple.fr' }),
      box.deps,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'unavailable' });
  });
});

describe('formulaire robot', () => {
  it('accepte un domaine et un e-mail', async () => {
    const box = memory();
    const res = await handleRobotOptOut(
      post('/api/robot', {
        domain: 'https://Exemple.FR/chemin',
        email: 'ada@exemple.fr',
        reason: 'merci',
      }),
      box.deps,
    );
    expect(res.status).toBe(202);
    expect(box.stored[0]?.target).toBe('exemple.fr');
    expect(box.stored[0]?.details.reason).toBe('merci');
  });

  it('refuse le même domaine au-delà du plafond', async () => {
    const box = memory();
    let status = 0;
    for (let i = 0; i < INTAKE.robot.domain.limit + 1; i += 1) {
      const res = await handleRobotOptOut(
        post(
          '/api/robot',
          { domain: 'exemple.fr', email: `ada${i}@exemple.fr` },
          `203.0.113.${(i % 200) + 1}`,
        ),
        box.deps,
      );
      status = res.status;
    }
    expect(status).toBe(429);
    expect(box.stored).toHaveLength(INTAKE.robot.domain.limit);
  });

  it('refuse un hôte local', async () => {
    const box = memory();
    const res = await handleRobotOptOut(
      post('/api/robot', { domain: 'localhost', email: 'ada@exemple.fr' }),
      box.deps,
    );
    expect(res.status).toBe(400);
    expect(box.stored).toEqual([]);
  });
});

describe('repli de la note', () => {
  it('ferme la note si la colonne est illisible', () => {
    expect(gateFallback(false, 72)).toEqual({
      siteVerified: false,
      globalScore: null,
    });
    expect(gateFallback(true, 72)).toEqual({
      siteVerified: true,
      globalScore: 72,
    });
  });

  it('retire le correctif branché tant que le site n’est pas prouvé', () => {
    expect(branchedFixKey(false, 'seo.title')).toBeNull();
    expect(branchedFixKey(true, 'seo.title')).toBe('seo.title');
    expect(branchedFixKey(true, null)).toBeNull();
  });
});
