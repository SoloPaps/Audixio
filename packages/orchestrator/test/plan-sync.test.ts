import { describe, expect, it } from 'vitest';
import { applyPlanSync, type PlanChange } from '../src/plan-sync.js';
import { processNextAudit } from '../src/process.js';
import {
  AUDIT_ID,
  captureLogger,
  claimed,
  failingCheck,
  memoryStore,
  offlineContext,
  serverCheck,
} from './helpers.js';

const AT = new Date('2026-11-03T08:00:00.000Z');

describe('plan après audit', () => {
  it('enregistre la fermeture avec sa date', async () => {
    const applied: PlanChange[] = [];
    const changes = await applyPlanSync(
      {
        async load() {
          return {
            items: [
              {
                id: '1',
                checkId: 'seo.titre',
                domain: 'seo',
                status: 'doing',
              },
            ],
            signals: [{ checkId: 'seo.titre', domain: 'seo', status: 'pass' }],
            memory: [],
          };
        },
        async apply(change) {
          applied.push(change);
        },
      },
      AUDIT_ID,
      AT,
    );
    expect(applied).toEqual(changes);
    expect(applied[0]).toMatchObject({
      to: 'auto_closed',
      reason: 'corrige',
      at: '2026-11-03T08:00:00.000Z',
      from: 'doing',
    });
  });

  it('rouvre la tâche si le constat revient', async () => {
    const applied: PlanChange[] = [];
    await applyPlanSync(
      {
        async load() {
          return {
            items: [
              {
                id: '1',
                checkId: 'seo.titre',
                domain: 'seo',
                status: 'auto_closed',
              },
            ],
            signals: [{ checkId: 'seo.titre', domain: 'seo', status: 'fail' }],
            memory: [{ checkId: 'seo.titre', from: 'todo' }],
          };
        },
        async apply(change) {
          applied.push(change);
        },
      },
      AUDIT_ID,
      AT,
    );
    expect(applied[0]).toMatchObject({
      to: 'todo',
      reason: 'revenu',
      at: '2026-11-03T08:00:00.000Z',
    });
  });

  it('est appelé une fois l’audit terminé, et un échec ne rate pas l’audit', async () => {
    const store = memoryStore([claimed()]);
    const seen: string[] = [];
    const { logger } = captureLogger();
    const result = await processNextAudit({
      store,
      dispatcher: {
        dispatch: async () => ({ ok: false, reason: 'not_configured' }),
      },
      checks: [serverCheck, failingCheck],
      fixes: new Map(),
      context: () => offlineContext(false),
      logger,
      now: () => 0,
      sleep: async () => {},
      pollMs: 1,
      runnerWaitMs: 1,
      planSync: async (auditId) => {
        seen.push(auditId);
        throw new Error('plan_hs');
      },
    });
    expect(result?.status).toBe('done');
    expect(seen).toEqual([AUDIT_ID]);
  });
});
