import { describe, expect, it } from 'vitest';
import { processNextAudit } from '../src/index.js';
import {
  browserCheck,
  captureLogger,
  claimed,
  memoryStore,
  offlineContext,
  serverCheck,
} from './helpers.js';

describe('hook e-mail de fin d’audit', () => {
  it('prévient après un audit terminé et après un échec', async () => {
    const seen: string[] = [];
    const store = memoryStore([claimed()]);
    const { logger } = captureLogger();
    const result = await processNextAudit({
      store,
      dispatcher: {
        dispatch: async () => ({ ok: false, reason: 'not_configured' }),
      },
      checks: [serverCheck],
      fixes: new Map(),
      context: () => offlineContext(false),
      logger,
      notifyEndEmail: async (auditId) => {
        seen.push(`done:${auditId}`);
      },
    });
    expect(result?.status).toBe('done');
    expect(seen).toEqual([`done:${result?.auditId}`]);

    const failed = memoryStore([claimed()]);
    const boom = await processNextAudit({
      store: failed,
      dispatcher: {
        dispatch: async () => {
          throw new Error('engine');
        },
      },
      checks: [serverCheck, browserCheck],
      fixes: new Map(),
      context: () => offlineContext(false),
      logger,
      notifyEndEmail: async (auditId) => {
        seen.push(`failed:${auditId}`);
      },
    });
    expect(boom?.status).toBe('failed');
    expect(seen).toEqual([
      `done:${result?.auditId}`,
      `failed:${boom?.auditId}`,
    ]);
  });
});
