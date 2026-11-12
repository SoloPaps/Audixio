import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { currentMailLocale, mailLocaleOf, t, withMailLocale } from './copy.js';
import type { Logger } from './log.js';
import { mailGrade, renderRecapMail } from './mail-templates.js';

/** API transactionnelle Brevo. Jamais le site audité. */
export const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/** API HTTP Resend. Jamais le site audité. */
export const RESEND_URL = 'https://api.resend.com/emails';

const SENDER_NAME = 'Audixio';

export const ALERT_KINDS = [
  'site_down',
  'site_recovered',
  'score_drop',
  'grave_problem',
  'cert_expiring',
] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];

export interface AlertPayload {
  dedup: string;
  site: string;
  before?: number;
  after?: number;
  count?: number;
  days?: number;
  suppressed?: boolean;
}

const alertPayloadSchema = z.object({
  dedup: z.string().min(1).max(200),
  site: z.string().min(1).max(80),
  before: z.number().int().optional(),
  after: z.number().int().optional(),
  count: z.number().int().positive().optional(),
  days: z.number().int().optional(),
  suppressed: z.boolean().optional(),
});

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

export interface OutboundMail extends RenderedMail {
  to: string;
  unsubscribeUrl: string;
}

export interface Mailer {
  send(message: OutboundMail): Promise<void>;
}

export interface DigestSite {
  label: string;
  host: string;
  score: number | null;
  previousScore?: number | null;
  checks: number;
  failures: number;
  openIncident: boolean;
  newFindings?: number;
  fixedFindings?: number;
  openProblems?: number;
  certDays?: number | null;
  sslWarnDays?: number;
}

/** Changement réel. Un problème déjà ouvert ne suffit pas : le récap calme le rappelle quand même. */
export function digestSiteChanged(site: DigestSite): boolean {
  if (site.openIncident) return true;
  if ((site.newFindings ?? 0) > 0 || (site.fixedFindings ?? 0) > 0) return true;
  if (
    typeof site.previousScore === 'number' &&
    typeof site.score === 'number' &&
    site.score !== site.previousScore
  ) {
    return true;
  }
  return (
    typeof site.certDays === 'number' &&
    site.certDays <= (site.sslWarnDays ?? 14)
  );
}

export function siteLabel(label: string, host: string): string {
  const raw = (label.trim() || host).replace(/[\r\n]+/g, ' ').trim();
  return raw.length > 80 ? raw.slice(0, 80) : raw;
}

export function formatUptime(checks: number, failures: number): string {
  if (checks <= 0) return t('mail.digest.uptime.none');
  const ok = Math.max(0, checks - Math.max(0, failures));
  const pct = Math.round((ok / checks) * 100);
  return t('mail.digest.uptime.pct', { pct });
}

export function parseAlertPayload(input: unknown): AlertPayload | null {
  const parsed = alertPayloadSchema.safeParse(input);
  if (!parsed.success) return null;
  const payload: AlertPayload = {
    dedup: parsed.data.dedup,
    site: parsed.data.site,
  };
  if (parsed.data.before !== undefined) payload.before = parsed.data.before;
  if (parsed.data.after !== undefined) payload.after = parsed.data.after;
  if (parsed.data.count !== undefined) payload.count = parsed.data.count;
  if (parsed.data.days !== undefined) payload.days = parsed.data.days;
  if (parsed.data.suppressed !== undefined) {
    payload.suppressed = parsed.data.suppressed;
  }
  return payload;
}

export function unsubscribeMac(key: string, userId: string): string {
  return createHmac('sha256', key)
    .update(`audigy-unsubscribe:${userId}`)
    .digest('hex');
}

export function unsubscribeUrl(
  origin: string,
  key: string,
  userId: string,
): string {
  const url = new URL('/api/unsubscribe', origin);
  url.searchParams.set('user', userId);
  url.searchParams.set('token', unsubscribeMac(key, userId));
  return url.toString();
}

export function verifyUnsubscribe(
  key: string,
  userId: string,
  token: string,
): boolean {
  if (!z.uuid().safeParse(userId).success) return false;
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  const expected = Buffer.from(unsubscribeMac(key, userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function senderEmail(origin: string): string {
  return `bonjour@${new URL(origin).hostname}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(
  paragraphs: readonly string[],
  links: readonly string[],
): string {
  const body = paragraphs
    .map(
      (paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');
  const anchors = links
    .map((link) => {
      const [label, href] = link.split('\n');
      return `<p style="margin:0 0 16px;"><a href="${escapeHtml(href ?? '')}" style="color:#0F5C5A;">${escapeHtml(label ?? '')}</a></p>`;
    })
    .join('');
  return `<!DOCTYPE html><html lang="${currentMailLocale()}"><head><meta charset="utf-8"><title>${escapeHtml(t('mail.link.open'))}</title></head><body style="margin:0;padding:24px;background:#FAF8F4;color:#1B1F24;font-family:Georgia,serif;font-size:16px;line-height:1.5;"><div style="max-width:560px;">${body}${anchors}</div></body></html>`;
}

function textOf(
  paragraphs: readonly string[],
  links: readonly string[],
): string {
  const lines = [...paragraphs];
  for (const link of links) lines.push(link);
  return lines.join('\n\n');
}

function links(appUrl: string, unsubscribeUrl: string): string[] {
  return [
    `${t('mail.link.open')}\n${appUrl}`,
    `${t('mail.link.unsubscribe')}\n${unsubscribeUrl}`,
  ];
}

function certCopy(
  site: string,
  days: number,
): { subject: string; lines: string[] } {
  if (days < 0) {
    return {
      subject: t('mail.alert.cert.expired.subject'),
      lines: [
        t('mail.alert.cert.expired.body', { site }),
        t('mail.alert.cert.expired.action'),
      ],
    };
  }
  const line =
    days === 0
      ? t('mail.alert.cert.today', { site })
      : days === 1
        ? t('mail.alert.cert.one', { site })
        : t('mail.alert.cert.many', { site, jours: days });
  return {
    subject: t('mail.alert.cert.soon.subject'),
    lines: [line, t('mail.alert.cert.action')],
  };
}

/** Gabarit texte + HTML. `null` si le payload ne correspond pas au type. */
export function renderAlert(input: {
  kind: AlertKind;
  payload: AlertPayload;
  appUrl: string;
  unsubscribeUrl: string;
  locale?: 'fr' | 'en';
}): RenderedMail | null {
  return withMailLocale(mailLocaleOf(input.locale), () =>
    renderAlertBody(input),
  );
}

function renderAlertBody(input: {
  kind: AlertKind;
  payload: AlertPayload;
  appUrl: string;
  unsubscribeUrl: string;
}): RenderedMail | null {
  const site = input.payload.site;
  let subject = '';
  let lines: string[] = [];
  switch (input.kind) {
    case 'site_down':
      subject = t('mail.alert.down.subject');
      lines = [
        t('mail.alert.down.body', { site }),
        t('mail.alert.down.action'),
      ];
      break;
    case 'site_recovered':
      subject = t('mail.alert.up.subject');
      lines = [t('mail.alert.up.body', { site }), t('mail.alert.up.done')];
      break;
    case 'score_drop':
      if (
        input.payload.before === undefined ||
        input.payload.after === undefined
      ) {
        return null;
      }
      subject = t('mail.alert.score.subject');
      lines = [
        t('mail.alert.score.body', {
          site,
          avant: input.payload.before,
          apres: input.payload.after,
        }),
        t('mail.alert.score.drop'),
      ];
      break;
    case 'grave_problem':
      if (input.payload.count === undefined) return null;
      subject = t('mail.alert.grave.subject');
      lines = [
        input.payload.count === 1
          ? t('mail.alert.grave.one', { site })
          : t('mail.alert.grave.many', { site, count: input.payload.count }),
      ];
      break;
    case 'cert_expiring':
      if (input.payload.days === undefined) return null;
      {
        const copy = certCopy(site, input.payload.days);
        subject = copy.subject;
        lines = copy.lines;
      }
      break;
    default:
      return null;
  }
  const anchors = links(input.appUrl, input.unsubscribeUrl);
  return {
    subject,
    text: textOf(lines, anchors),
    html: layout(lines, anchors),
  };
}

function digestDelta(
  site: DigestSite,
): { label: string; tone: 'up' | 'dn' | 'eq' } | undefined {
  if (
    typeof site.previousScore !== 'number' ||
    typeof site.score !== 'number'
  ) {
    return undefined;
  }
  const diff = site.score - site.previousScore;
  if (diff > 0) {
    return { label: t('mail.digest.delta.up', { points: diff }), tone: 'up' };
  }
  if (diff < 0) {
    return {
      label: t('mail.digest.delta.down', { points: -diff }),
      tone: 'dn',
    };
  }
  return { label: t('mail.digest.delta.same'), tone: 'eq' };
}

function countLine(
  count: number,
  none: 'mail.digest.open.none',
  one: 'mail.digest.open.one' | 'mail.digest.new.one' | 'mail.digest.fixed.one',
  many:
    | 'mail.digest.open.many'
    | 'mail.digest.new.many'
    | 'mail.digest.fixed.many',
): string {
  if (count <= 0) return t(none);
  if (count === 1) return t(one);
  return t(many, { count });
}

export function renderDigest(input: {
  sites: readonly DigestSite[];
  appUrl: string;
  unsubscribeUrl: string;
  locale?: 'fr' | 'en';
}): RenderedMail {
  return withMailLocale(mailLocaleOf(input.locale), () =>
    renderDigestBody(input),
  );
}

function renderDigestBody(input: {
  sites: readonly DigestSite[];
  appUrl: string;
  unsubscribeUrl: string;
}): RenderedMail {
  const origin = input.appUrl.replace(/\/$/u, '');
  const cards = input.sites.map((site) => {
    const name = siteLabel(site.label, site.host);
    const score =
      site.score === null ? t('mail.digest.score.none') : String(site.score);
    const items = [
      t('mail.digest.line', {
        site: name,
        score,
        uptime: formatUptime(site.checks, site.failures),
      }),
    ];
    if (typeof site.openProblems === 'number') {
      items.push(
        countLine(
          site.openProblems,
          'mail.digest.open.none',
          'mail.digest.open.one',
          'mail.digest.open.many',
        ),
      );
    }
    if ((site.newFindings ?? 0) > 0) {
      items.push(
        (site.newFindings ?? 0) === 1
          ? t('mail.digest.new.one')
          : t('mail.digest.new.many', { count: site.newFindings ?? 0 }),
      );
    }
    if ((site.fixedFindings ?? 0) > 0) {
      items.push(
        (site.fixedFindings ?? 0) === 1
          ? t('mail.digest.fixed.one')
          : t('mail.digest.fixed.many', { count: site.fixedFindings ?? 0 }),
      );
    }
    if (site.openIncident) items.push(t('mail.digest.incident'));
    const delta = digestDelta(site);
    const ssl =
      typeof site.certDays === 'number' &&
      site.certDays <= (site.sslWarnDays ?? 14)
        ? t('mail.digest.ssl', { jours: site.certDays })
        : undefined;
    return {
      grade: mailGrade(site.score) ?? '–',
      host: name,
      items,
      ...(delta ? { delta } : {}),
      ...(ssl ? { ssl } : {}),
    };
  });
  return renderRecapMail({
    mode: input.sites.some((site) => digestSiteChanged(site))
      ? 'change'
      : 'steady',
    cards,
    reportUrl: input.appUrl,
    prefsUrl: `${origin}/compte#alertes`,
    legalUrl: `${origin}/mentions-legales`,
    unsubscribeUrl: input.unsubscribeUrl,
    logoUrl: `${origin}/marque/logo-pc.svg`,
  });
}

export function createBrevoMailer(options: {
  apiKey: string;
  senderEmail: string;
  fetch?: typeof globalThis.fetch;
}): Mailer {
  const doFetch = options.fetch ?? globalThis.fetch;
  return {
    async send(message) {
      if (
        /[\r\n]/.test(message.to) ||
        /[\r\n]/.test(message.subject) ||
        /[\r\n]/.test(message.unsubscribeUrl) ||
        /[\r\n]/.test(options.senderEmail)
      ) {
        throw new Error('mail_header');
      }
      const res = await doFetch(BREVO_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(8_000),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': options.apiKey,
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: options.senderEmail },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
          headers: {
            'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      await res.body?.cancel();
      if (!res.ok) throw new Error('brevo_rejected');
    },
  };
}

export interface TransactionalMail extends RenderedMail {
  to: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface TransactionalMailer {
  send(message: TransactionalMail): Promise<void>;
}

export function createResendMailer(options: {
  apiKey: string;
  senderEmail: string;
  replyTo?: string;
  fetch?: typeof globalThis.fetch;
}): TransactionalMailer {
  const doFetch = options.fetch ?? globalThis.fetch;
  return {
    async send(message) {
      const replyTo = message.replyTo ?? options.replyTo ?? '';
      if (
        /[\r\n]/.test(message.to) ||
        /[\r\n]/.test(message.subject) ||
        /[\r\n]/.test(options.senderEmail) ||
        (replyTo !== '' && /[\r\n]/.test(replyTo))
      ) {
        throw new Error('mail_header');
      }
      const headers: Record<string, string> = {
        accept: 'application/json',
        authorization: `Bearer ${options.apiKey}`,
        'content-type': 'application/json',
      };
      if (message.idempotencyKey) {
        headers['Idempotency-Key'] = message.idempotencyKey;
      }
      const body: Record<string, unknown> = {
        from: `${SENDER_NAME} <${options.senderEmail}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      };
      if (replyTo) body.reply_to = replyTo;
      const res = await doFetch(RESEND_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(8_000),
        headers,
        body: JSON.stringify(body),
      });
      await res.body?.cancel();
      if (!res.ok) throw new Error('resend_rejected');
    },
  };
}

export interface UnsubscribeDeps {
  key: string;
  logger: Logger;
  apply(userId: string): Promise<void>;
}

const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function page(kind: 'form' | 'done' | 'invalid', action?: string): string {
  const title = t('mail.unsub.title');
  const button = `padding:12px 16px;background:#0F5C5A;color:#FAF8F4;border:0;border-radius:8px;font-size:16px;`;
  let main = '';
  if (kind === 'form') {
    main = `<p style="margin:0 0 16px;">${escapeHtml(t('mail.unsub.prompt'))}</p><form method="post" action="${escapeHtml(action ?? '')}"><button type="submit" style="${button}">${escapeHtml(t('mail.unsub.button'))}</button></form>`;
  } else if (kind === 'done') {
    main = `<p style="margin:0 0 16px;">${escapeHtml(t('mail.unsub.done'))}</p>`;
  } else {
    main = `<p style="margin:0 0 16px;">${escapeHtml(t('mail.unsub.invalid'))}</p>`;
  }
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:24px;background:#FAF8F4;color:#1B1F24;font-family:Georgia,serif;"><div style="max-width:560px;"><h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">${escapeHtml(title)}</h1>${main}</div></body></html>`;
}

function htmlResponse(status: number, html: string): Response {
  return new Response(html, { status, headers: PAGE_HEADERS });
}

/** GET : confirmation. POST (List-Unsubscribe ou bouton) : désabonnement. */
export async function handleUnsubscribe(
  req: Request,
  deps: UnsubscribeDeps,
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers: { allow: 'GET, POST' },
    });
  }
  const url = new URL(req.url);
  const user = url.searchParams.get('user') ?? '';
  const token = url.searchParams.get('token') ?? '';
  if (!verifyUnsubscribe(deps.key, user, token)) {
    return htmlResponse(400, page('invalid'));
  }
  if (req.method === 'GET') {
    return htmlResponse(200, page('form', `?${url.searchParams.toString()}`));
  }
  await deps.apply(user);
  deps.logger.info('unsubscribed', {});
  return htmlResponse(200, page('done'));
}
