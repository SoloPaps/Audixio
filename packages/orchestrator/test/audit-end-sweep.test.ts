import { describe, expect, it } from 'vitest';
import {
  AUDIT_END_EMAIL_LOOKBACK_MS,
  type AuditEndRecord,
  type AuditEndStore,
  sweepAuditEndEmails,
  withinAuditEndLookback,
} from '../src/audit-end-mail.js';
import { processNextAudit } from '../src/index.js';
import type { TransactionalMail, TransactionalMailer } from '../src/mail.js';
import {
  runScheduleTick,
  type ScheduleDeps,
  type ScheduleStore,
} from '../src/schedule.js';
import {
  captureLogger,
  memoryStore,
  offlineContext,
  serverCheck,
} from './helpers.js';

const ORIGIN = 'https://audixio.fr';
const NOW = new Date('2026-11-10T16:00:00.000Z');

const baseEnv = {
  AUDIT_END_EMAIL_ENABLED: 'true',
  RESEND_API_KEY: 're_test_key_not_real',
  APP_BASE_URL: ORIGIN,
};

function record(
  patch: Partial<AuditEndRecord> & Pick<AuditEndRecord, 'auditId'>,
): AuditEndRecord {
  return {
    status: 'failed',
    trigger: 'manual',
    error: 'stale',
    globalScore: null,
    domain: 'exemple.fr',
    siteId: '0d6c8a8e-2f8a-4c7e-9a52-0f7a1d2b3c4d',
    siteUrl: 'https://exemple.fr',
    email: 'ada@exemple.fr',
    locale: 'fr',
    notifyAuditEnd: true,
    priorities: [],
    ...patch,
  };
}

function storeOf(
  rows: ReadonlyArray<{
    row: AuditEndRecord;
    finishedAt: Date;
    sent?: boolean;
  }>,
): AuditEndStore & { claims: number } {
  const sent = new Set(
    rows.filter((item) => item.sent).map((item) => item.row.auditId),
  );
  const box: AuditEndStore & { claims: number } = {
    claims: 0,
    async load(auditId) {
      return rows.find((item) => item.row.auditId === auditId)?.row ?? null;
    },
    async claim(auditId) {
      box.claims += 1;
      if (sent.has(auditId)) return false;
      sent.add(auditId);
      return true;
    },
    async release(auditId) {
      sent.delete(auditId);
    },
    async listRecentPending(now, lookbackMs) {
      return rows
        .filter(
          (item) =>
            !sent.has(item.row.auditId) &&
            item.row.trigger === 'manual' &&
            (item.row.status === 'done' || item.row.status === 'failed') &&
            withinAuditEndLookback(item.finishedAt, now, lookbackMs),
        )
        .map((item) => item.row.auditId);
    },
  };
  return box;
}

function mailerOf(): TransactionalMailer & { sent: TransactionalMail[] } {
  const sent: TransactionalMail[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}

describe('fenêtre du balayage de fin d’audit', () => {
  it('accepte un audit terminé dans les 24 h et refuse un plus ancien', () => {
    const recent = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    const old = new Date(NOW.getTime() - AUDIT_END_EMAIL_LOOKBACK_MS - 1);
    expect(withinAuditEndLookback(recent, NOW)).toBe(true);
    expect(withinAuditEndLookback(NOW.toISOString(), NOW)).toBe(true);
    expect(withinAuditEndLookback(old, NOW)).toBe(false);
    expect(withinAuditEndLookback(null, NOW)).toBe(false);
    expect(withinAuditEndLookback(new Date(NOW.getTime() + 60_000), NOW)).toBe(
      false,
    );
  });
});

describe('balayage des e-mails hors writeResults', () => {
  it('envoie une seule fois l’échec d’un audit fail_stale récent, ignore les anciens et les programmés', async () => {
    const staleId = '11111111-1111-4111-8111-111111111111';
    const oldId = '22222222-2222-4222-8222-222222222222';
    const scheduledId = '33333333-3333-4333-8333-333333333333';
    const alreadyId = '44444444-4444-4444-8444-444444444444';
    const store = storeOf([
      {
        row: record({ auditId: staleId, error: 'stale' }),
        finishedAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      },
      {
        row: record({ auditId: oldId, error: 'stale' }),
        finishedAt: new Date(
          NOW.getTime() - AUDIT_END_EMAIL_LOOKBACK_MS - 60_000,
        ),
      },
      {
        row: record({
          auditId: scheduledId,
          trigger: 'schedule',
          error: 'stale',
        }),
        finishedAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      },
      {
        row: record({ auditId: alreadyId, error: 'stale' }),
        finishedAt: new Date(NOW.getTime() - 5 * 60 * 1000),
        sent: true,
      },
    ]);
    const mailer = mailerOf();
    const { logger } = captureLogger();
    const first = await sweepAuditEndEmails({
      env: baseEnv,
      logger,
      store,
      mailer,
      now: NOW,
    });
    expect(first.considered).toBe(1);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('ada@exemple.fr');
    expect(mailer.sent[0]?.subject).toContain('n’a pas pu aller au bout');
    const second = await sweepAuditEndEmails({
      env: baseEnv,
      logger,
      store,
      mailer,
      now: NOW,
    });
    expect(second.considered).toBe(0);
    expect(mailer.sent).toHaveLength(1);
    expect(store.claims).toBe(1);
  });

  it('est lancé après fail_stale même si la file d’audits est vide', async () => {
    const swept: string[] = [];
    const store = memoryStore([]);
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
      sweepEndEmails: async () => {
        swept.push('tick');
      },
    });
    expect(result).toBeNull();
    expect(store.staleCalls).toEqual([20]);
    expect(swept).toEqual(['tick']);
  });

  it('est lancé au début du tick de l’orchestrateur', async () => {
    const swept: string[] = [];
    const empty: ScheduleStore = {
      async roster() {
        return { sites: [], due: [] };
      },
      async insertCheck() {},
      async openIncident() {
        return null;
      },
      async resolveIncident() {},
      async findAlert() {
        return false;
      },
      async insertAlert() {
        return { status: 'duplicate' };
      },
      async markAlertSent() {},
      async pendingAlerts() {
        return [];
      },
      async advanceSchedule() {
        return false;
      },
      async enqueue() {
        return 'skip';
      },
      async rollup() {
        return { days: 0, purged: 0 };
      },
      async userEmail() {
        return null;
      },
    };
    const { logger } = captureLogger();
    const deps: ScheduleDeps = {
      now: () => NOW,
      store: empty,
      probe: async () => ({ ok: true, statusCode: 200, ms: 1 }),
      mailer: null,
      appBaseUrl: ORIGIN,
      signingKey: 'test-key',
      logger,
      trigger: async () => {},
      sweepEndEmails: async () => {
        swept.push('schedule');
      },
    };
    await runScheduleTick(deps);
    expect(swept).toEqual(['schedule']);
  });
});
