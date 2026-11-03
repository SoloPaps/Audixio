import { t } from './copy.js';

export type MailGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Même barème que `gradeForScore` de l’app (90 / 80 / 65 / 50 / 35). */
export function mailGrade(score: number | null): MailGrade | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  if (score >= 35) return 'E';
  return 'F';
}

export interface RecapCard {
  grade: string;
  host: string;
  delta?: { label: string; tone: 'up' | 'dn' | 'eq' };
  items: readonly string[];
  ssl?: string;
}

export interface MailDocument {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gradeStyle(grade: string): string {
  if (grade === 'C') return 'background:#FBEFD9;color:#8A5A0B;';
  if (grade === 'D' || grade === 'E' || grade === 'F') {
    return 'background:#FBE3DA;color:#9A3516;';
  }
  return 'background:#E3ECFB;color:#2C4A9A;';
}

const FONT = "Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function shell(input: {
  title: string;
  logoUrl: string;
  body: string;
  footer: string;
}): string {
  const logo = input.logoUrl
    ? `<a href="${escapeHtml(input.logoUrl.replace(/\/marque\/logo-pc\.svg$/u, '/') || '/')}" style="text-decoration:none;"><img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(t('mail.brand'))}" width="140" height="32" style="height:32px;width:auto;border:0;display:block;"></a>`
    : `<span style="font:700 20px ${FONT};color:#3D52A0;">${escapeHtml(t('mail.brand'))}</span>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex"><title>${escapeHtml(input.title)}</title><style>@media (max-width:480px){.hd,.bd,.ft{padding-left:20px!important;padding-right:20px!important}h1{font-size:21px!important}.btn{display:block!important;text-align:center!important}}</style></head><body style="margin:0;padding:0;background:#EDE8F5;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#EDE8F5;"><tr><td align="center" style="padding:32px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;background:#FFFFFF;border:1px solid #D9DFEE;border-radius:16px;"><tr><td class="hd" style="padding:24px 32px;border-bottom:1px solid #EDE8F5;">${logo}</td></tr><tr><td class="bd" style="padding:32px;font:15px/1.6 ${FONT};color:#3B4675;">${input.body}</td></tr><tr><td class="ft" style="padding:24px 32px;background:#F8F6FC;border-top:1px solid #EDE8F5;border-radius:0 0 16px 16px;font:12px/1.6 ${FONT};color:#59648F;">${input.footer}</td></tr></table></td></tr></table></body></html>`;
}

function button(label: string, href: string): string {
  return `<p style="margin:24px 0 0;"><a class="btn" href="${escapeHtml(href)}" style="display:inline-block;background:#3D52A0;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">${escapeHtml(label)}</a></p>`;
}

function footerBlock(input: {
  why: string;
  prefsUrl: string;
  legalUrl: string;
  unsubscribeUrl: string;
}): string {
  const link = (label: string, href: string) =>
    `<a href="${escapeHtml(href)}" style="color:#3D52A0;">${escapeHtml(label)}</a>`;
  return `${escapeHtml(input.why)}<br>${escapeHtml(t('mail.digest.question'))} ${link(t('mail.digest.contact'), `mailto:${t('mail.digest.contact')}`)}<br>${link(t('mail.digest.prefs'), input.prefsUrl)} · ${link(t('mail.link.unsubscribe'), input.unsubscribeUrl)} · ${link(t('mail.digest.legal'), input.legalUrl)}<br>${escapeHtml(t('mail.digest.copy'))}`;
}

function card(row: RecapCard): string {
  const chip = `<span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:9px;font-weight:800;font-size:16px;${gradeStyle(row.grade)}">${escapeHtml(row.grade)}</span>`;
  const tone =
    row.delta?.tone === 'up'
      ? '#1F7A4D'
      : row.delta?.tone === 'dn'
        ? '#B23A1E'
        : '#59648F';
  const delta = row.delta
    ? ` <span style="color:${tone};font-weight:700;">${escapeHtml(row.delta.label)}</span>`
    : '';
  const items =
    row.items.length === 0
      ? ''
      : `<ul style="margin:8px 0 0;padding-left:18px;color:#3B4675;font-size:13px;line-height:1.6;">${row.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  const ssl = row.ssl
    ? `<span style="display:inline-block;margin-top:8px;font-size:12px;padding:3px 8px;border-radius:6px;background:#FBEFD9;color:#8A5A0B;">${escapeHtml(row.ssl)}</span>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #D9DFEE;border-radius:12px;margin:0 0 14px;"><tr><td style="width:44px;padding:14px 16px;font-size:14px;vertical-align:top;">${chip}</td><td style="padding:14px 16px;font-size:14px;vertical-align:top;font-family:${FONT};color:#1E2A55;"><b>${escapeHtml(row.host)}</b>${delta}${items}${ssl}</td></tr></table>`;
}

export function renderRecapMail(input: {
  mode: 'change' | 'steady';
  cards: readonly RecapCard[];
  reportUrl: string;
  prefsUrl: string;
  legalUrl: string;
  unsubscribeUrl: string;
  logoUrl: string;
}): MailDocument {
  const steady = input.mode === 'steady';
  const subject = steady
    ? t('mail.digest.steady.subject')
    : t('mail.digest.subject');
  const intro = steady ? t('mail.digest.steady.intro') : t('mail.digest.intro');
  const heading = `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#1E2A55;font-family:${FONT};">${escapeHtml(subject)}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3B4675;">${escapeHtml(intro)}</p>`;
  const html = shell({
    title: subject,
    logoUrl: input.logoUrl,
    body: `${heading}${input.cards.map(card).join('')}${button(t('mail.digest.report'), input.reportUrl)}`,
    footer: footerBlock({
      why: t('mail.digest.why.change'),
      prefsUrl: input.prefsUrl,
      legalUrl: input.legalUrl,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
  });
  const lines = [subject, intro];
  for (const row of input.cards) {
    const delta = row.delta ? ` ${row.delta.label}` : '';
    lines.push(`${row.host}${delta}`);
    lines.push(...row.items);
    if (row.ssl) lines.push(row.ssl);
  }
  lines.push(
    `${t('mail.digest.report')}\n${input.reportUrl}`,
    t('mail.digest.why.change'),
    `${t('mail.digest.question')} ${t('mail.digest.contact')}`,
    `${t('mail.digest.prefs')}\n${input.prefsUrl}`,
    `${t('mail.link.unsubscribe')}\n${input.unsubscribeUrl}`,
    `${t('mail.digest.legal')}\n${input.legalUrl}`,
  );
  return { subject, text: lines.join('\n\n'), html };
}

export function renderSignupMail(input: {
  confirmUrl: string;
  code?: string;
  prefsUrl: string;
  legalUrl: string;
  unsubscribeUrl: string;
  logoUrl: string;
}): MailDocument {
  const subject = t('mail.signup.subject');
  const code = input.code
    ? `<p style="margin:0 0 16px;font-size:13px;color:#59648F;">${escapeHtml(t('mail.signup.code', { code: input.code }))}</p>`
    : '';
  const body = `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#1E2A55;font-family:${FONT};">${escapeHtml(t('mail.signup.title'))}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3B4675;">${escapeHtml(t('mail.signup.lead'))}</p>${button(t('mail.signup.action'), input.confirmUrl)}<p style="margin:0 0 16px;font-size:13px;color:#59648F;">${escapeHtml(t('mail.signup.expire'))}</p><p style="margin:0 0 16px;font-size:13px;color:#59648F;word-break:break-all;">${escapeHtml(t('mail.signup.fallback'))}<br><a href="${escapeHtml(input.confirmUrl)}" style="color:#3D52A0;">${escapeHtml(input.confirmUrl)}</a></p>${code}`;
  const html = shell({
    title: subject,
    logoUrl: input.logoUrl,
    body,
    footer: footerBlock({
      why: t('mail.digest.why.signup'),
      prefsUrl: input.prefsUrl,
      legalUrl: input.legalUrl,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
  });
  const lines = [
    t('mail.signup.title'),
    t('mail.signup.lead'),
    `${t('mail.signup.action')}\n${input.confirmUrl}`,
    t('mail.signup.expire'),
    `${t('mail.signup.fallback')}\n${input.confirmUrl}`,
  ];
  if (input.code) lines.push(t('mail.signup.code', { code: input.code }));
  lines.push(
    t('mail.digest.why.signup'),
    `${t('mail.link.unsubscribe')}\n${input.unsubscribeUrl}`,
  );
  return { subject, text: lines.join('\n\n'), html };
}

/** Gabarit GoTrue : le HTML est celui qui part vraiment. Le texte est le jumeau. */
export function supabaseSignupTemplate(siteUrl: string): {
  html: string;
  text: string;
} {
  const origin = siteUrl.replace(/\/$/u, '');
  const mail = renderSignupMail({
    confirmUrl: '{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup',
    code: '{{ .Token }}',
    prefsUrl: `${origin}/compte/alertes`,
    legalUrl: `${origin}/mentions-legales`,
    unsubscribeUrl: `${origin}/compte/alertes`,
    logoUrl: `${origin}/marque/logo-pc.svg`,
  });
  return { html: mail.html, text: mail.text };
}
