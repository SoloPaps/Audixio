import { gradeForScore } from '@audigy/db';
import type { Logger } from './log.js';
import { createResendMailer, type TransactionalMailer } from './mail.js';
import { type AuditEndReason, renderAuditEndMail } from './mail-templates.js';

export const AUDIT_END_EMAIL_ENABLED = 'AUDIT_END_EMAIL_ENABLED';
export const DEFAULT_AUDIT_END_FROM = 'ne-pas-repondre@audixio.fr';
export const DEFAULT_AUDIT_END_REPLY_TO = 'Audixio@outlook.fr';

export type AuditEndSkip =
  | 'disabled'
  | 'scheduled'
  | 'setting_off'
  | 'already_sent'
  | 'no_recipient'
  | 'not_terminal';

export interface AuditEndRecord {
  auditId: string;
  status: 'done' | 'failed' | string;
  trigger: 'manual' | 'schedule' | string;
  error: string | null;
  globalScore: number | null;
  domain: string;
  siteId: string;
  siteUrl: string;
  email: string | null;
  locale: 'fr' | 'en';
  notifyAuditEnd: boolean;
  priorities: readonly string[];
}

export interface AuditEndStore {
  load(auditId: string): Promise<AuditEndRecord | null>;
  claim(auditId: string): Promise<boolean>;
  release(auditId: string): Promise<void>;
  /** Audits manuels terminés récemment, sans e-mail encore réservé. */
  listRecentPending?(now: Date, lookbackMs: number): Promise<string[]>;
}

/** Fenêtre du balayage : n'écrit jamais aux audits plus anciens. */
export const AUDIT_END_EMAIL_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export function withinAuditEndLookback(
  finishedAt: string | Date | null,
  now: Date,
  lookbackMs: number = AUDIT_END_EMAIL_LOOKBACK_MS,
): boolean {
  if (!finishedAt) return false;
  const at =
    finishedAt instanceof Date ? finishedAt.getTime() : Date.parse(finishedAt);
  if (!Number.isFinite(at)) return false;
  const instant = now.getTime();
  return at <= instant && instant - at <= lookbackMs;
}

export function auditEndEmailEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return (env[AUDIT_END_EMAIL_ENABLED] ?? '').trim().toLowerCase() === 'true';
}

export function resendApiKey(env: Record<string, string | undefined>): string {
  return (env.RESEND_API_KEY ?? '').trim();
}

export function auditEndSender(env: Record<string, string | undefined>): {
  from: string;
  replyTo: string;
} {
  return {
    from: (env.AUDIT_END_EMAIL_FROM ?? DEFAULT_AUDIT_END_FROM).trim(),
    replyTo: (
      env.AUDIT_END_EMAIL_REPLY_TO ?? DEFAULT_AUDIT_END_REPLY_TO
    ).trim(),
  };
}

export function privateReportUrl(origin: string, auditId: string): string {
  const base = origin.replace(/\/$/u, '');
  const url = new URL('/rapport', `${base}/`);
  url.searchParams.set('id', auditId);
  return url.toString();
}

export function relaunchAuditUrl(
  origin: string,
  siteId: string,
  siteUrl?: string,
): string {
  const base = origin.replace(/\/$/u, '');
  const url = new URL('/progression', `${base}/`);
  url.searchParams.set('site', siteId);
  if (siteUrl) url.searchParams.set('url', siteUrl);
  return url.toString();
}

export function auditEndReasonOf(error: string | null): AuditEndReason {
  const text = (error ?? '').toLowerCase();
  if (text.includes('stale')) return 'stale';
  if (
    text.includes('403') ||
    text.includes('refus') ||
    text.includes('denied') ||
    text.includes('waf') ||
    text.includes('forbidden')
  ) {
    return 'denied';
  }
  if (
    text.includes('timeout') ||
    text.includes('unreachable') ||
    text.includes('injoign') ||
    text.includes('econn')
  ) {
    return 'down';
  }
  return 'generic';
}

export function linkLooksSafe(href: string): boolean {
  if (/[?&](token|jeton|share|access_token)=/i.test(href)) return false;
  if (/[0-9a-f]{32}/i.test(new URL(href).search + new URL(href).hash)) {
    return false;
  }
  return true;
}

function appOrigin(env: Record<string, string | undefined>): string {
  const raw = (env.APP_BASE_URL ?? 'https://audixio.fr').trim();
  return raw.replace(/\/$/u, '');
}

export async function sendAuditEndEmail(input: {
  auditId: string;
  env: Record<string, string | undefined>;
  logger: Logger;
  store: AuditEndStore;
  mailer?: TransactionalMailer;
}): Promise<'sent' | AuditEndSkip | 'failed'> {
  const { auditId, env, logger, store } = input;
  if (!auditEndEmailEnabled(env) || resendApiKey(env) === '') {
    logger.info('envoi désactivé', { auditId });
    return 'disabled';
  }
  const record = await store.load(auditId);
  if (!record) return 'not_terminal';
  if (record.trigger !== 'manual') return 'scheduled';
  if (record.status !== 'done' && record.status !== 'failed') {
    return 'not_terminal';
  }
  if (!record.notifyAuditEnd) return 'setting_off';
  const to = record.email?.trim() ?? '';
  if (to === '' || !to.includes('@')) return 'no_recipient';

  const claimed = await store.claim(auditId);
  if (!claimed) return 'already_sent';

  const origin = appOrigin(env);
  const prefsUrl = `${origin}/compte`;
  const legalUrl = `${origin}/mentions-legales`;
  const actionUrl =
    record.status === 'failed'
      ? relaunchAuditUrl(origin, record.siteId, record.siteUrl)
      : privateReportUrl(origin, record.auditId);
  if (!linkLooksSafe(actionUrl)) {
    await store.release(auditId);
    logger.error('audit_end_email_link', { auditId });
    return 'failed';
  }

  const mail =
    record.status === 'failed'
      ? renderAuditEndMail({
          outcome: 'failed',
          domain: record.domain,
          reason: auditEndReasonOf(record.error),
          actionUrl,
          prefsUrl,
          legalUrl,
          locale: record.locale,
        })
      : renderAuditEndMail({
          outcome: 'ready',
          domain: record.domain,
          score: record.globalScore,
          grade: gradeForScore(record.globalScore),
          priorities: record.priorities.slice(0, 3),
          actionUrl,
          prefsUrl,
          legalUrl,
          locale: record.locale,
        });

  const sender = auditEndSender(env);
  const mailer =
    input.mailer ??
    createResendMailer({
      apiKey: resendApiKey(env),
      senderEmail: sender.from,
      replyTo: sender.replyTo,
    });
  try {
    await mailer.send({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: sender.replyTo,
      idempotencyKey: `audit-end/${auditId}`,
    });
    logger.info('audit_end_email_sent', { auditId });
    return 'sent';
  } catch (error) {
    await store.release(auditId);
    logger.error('audit_end_email_failed', {
      auditId,
      code: error instanceof Error ? error.message : 'error',
    });
    return 'failed';
  }
}

export async function sweepAuditEndEmails(input: {
  env: Record<string, string | undefined>;
  logger: Logger;
  store: AuditEndStore;
  mailer?: TransactionalMailer;
  now?: Date;
  lookbackMs?: number;
}): Promise<{ considered: number }> {
  const list = input.store.listRecentPending;
  if (!list) return { considered: 0 };
  const now = input.now ?? new Date();
  const lookback = input.lookbackMs ?? AUDIT_END_EMAIL_LOOKBACK_MS;
  const ids = await list.call(input.store, now, lookback);
  for (const auditId of ids) {
    try {
      await sendAuditEndEmail({
        auditId,
        env: input.env,
        logger: input.logger,
        store: input.store,
        ...(input.mailer ? { mailer: input.mailer } : {}),
      });
    } catch (error) {
      input.logger.error('audit_end_email_sweep', {
        auditId,
        code: error instanceof Error ? error.message : 'error',
      });
    }
  }
  return { considered: ids.length };
}
