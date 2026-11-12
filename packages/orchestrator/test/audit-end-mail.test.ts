import { gradeForScore } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  type AuditEndRecord,
  type AuditEndStore,
  auditEndReasonOf,
  linkLooksSafe,
  privateReportUrl,
  relaunchAuditUrl,
  sendAuditEndEmail,
} from '../src/audit-end-mail.js';
import type { Logger } from '../src/log.js';
import type { TransactionalMail, TransactionalMailer } from '../src/mail.js';
import { renderAuditEndMail } from '../src/mail-templates.js';

const AUDIT = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://audixio.fr';

function record(extra: Partial<AuditEndRecord> = {}): AuditEndRecord {
  return {
    auditId: AUDIT,
    status: 'done',
    trigger: 'manual',
    error: null,
    globalScore: 65,
    domain: 'exemple.fr',
    siteId: SITE,
    siteUrl: 'https://exemple.fr',
    email: 'owner@exemple.fr',
    locale: 'fr',
    notifyAuditEnd: true,
    priorities: [
      'Ajouter un texte alternatif aux images du bandeau.',
      'Activer HSTS sur le domaine.',
      'Publier un fichier robots.txt explicite.',
    ],
    ...extra,
  };
}

function logger(): { log: Logger; events: string[] } {
  const events: string[] = [];
  const log: Logger = {
    info: (event) => {
      events.push(event);
    },
    warn: (event) => {
      events.push(event);
    },
    error: (event) => {
      events.push(event);
    },
  };
  return { log, events };
}

function storeOf(
  row: AuditEndRecord | null,
  options: { claimed?: boolean } = {},
): AuditEndStore & { claims: number; releases: number } {
  const current = row;
  const box = {
    claims: 0,
    releases: 0,
    async load() {
      return current;
    },
    async claim() {
      box.claims += 1;
      if (!current || options.claimed) return false;
      options.claimed = true;
      return true;
    },
    async release() {
      box.releases += 1;
      options.claimed = false;
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

const baseEnv = {
  AUDIT_END_EMAIL_ENABLED: 'true',
  RESEND_API_KEY: 're_test_key_not_real',
  AUDIT_END_EMAIL_FROM: 'ne-pas-repondre@audixio.fr',
  AUDIT_END_EMAIL_REPLY_TO: 'Audixio@outlook.fr',
  APP_BASE_URL: ORIGIN,
};

describe('rendu de l’e-mail de fin d’audit', () => {
  it('réussi FR : objet, note, lettre, priorités et lien privé sans jeton', () => {
    const href = privateReportUrl(ORIGIN, AUDIT);
    const mail = renderAuditEndMail({
      outcome: 'ready',
      domain: 'exemple.fr',
      score: 65,
      grade: gradeForScore(65),
      priorities: [
        'Ajouter un texte alternatif aux images du bandeau.',
        'Activer HSTS sur le domaine.',
        'Publier un fichier robots.txt explicite.',
      ],
      actionUrl: href,
      prefsUrl: `${ORIGIN}/compte`,
      legalUrl: `${ORIGIN}/mentions-legales`,
      locale: 'fr',
    });
    expect(gradeForScore(65)).toBe('C');
    expect(mail.subject).toBe(
      'Votre audit de exemple.fr est prêt : C (65/100)',
    );
    expect(mail.text).toContain('C (65/100)');
    expect(mail.text).toContain('Ajouter un texte alternatif');
    expect(mail.text).toContain('Activer HSTS');
    expect(mail.text).toContain('Publier un fichier robots.txt');
    expect(mail.html).toContain('Voir le rapport');
    expect(mail.html).toContain(href);
    expect(mail.html).not.toMatch(/https?:\/\/[^"' ]+\/marque\//);
    expect(linkLooksSafe(href)).toBe(true);
    expect(href).toBe(`https://audixio.fr/rapport/${AUDIT}`);
    expect(mail.html).not.toMatch(/[?&](token|jeton|share)=/i);
    expect(mail.text).not.toMatch(/[?&](token|jeton|share)=/i);
  });

  it('réussi EN : mêmes faits, textes du catalogue anglais', () => {
    const href = privateReportUrl(ORIGIN, AUDIT);
    const mail = renderAuditEndMail({
      outcome: 'ready',
      domain: 'exemple.fr',
      score: 65,
      grade: 'C',
      priorities: ['Add alt text to the banner images.'],
      actionUrl: href,
      prefsUrl: `${ORIGIN}/compte`,
      legalUrl: `${ORIGIN}/mentions-legales`,
      locale: 'en',
    });
    expect(mail.subject).toBe('Your audit of exemple.fr is ready: C (65/100)');
    expect(mail.html).toContain('View the report');
    expect(mail.text).toContain('Add alt text to the banner images.');
  });

  it('échec FR : objet, raison en clair, bouton de relance sans jeton', () => {
    const href = relaunchAuditUrl(ORIGIN, SITE, 'https://exemple.fr');
    expect(auditEndReasonOf('http 403 waf')).toBe('denied');
    const mail = renderAuditEndMail({
      outcome: 'failed',
      domain: 'exemple.fr',
      reason: 'denied',
      actionUrl: href,
      prefsUrl: `${ORIGIN}/compte`,
      legalUrl: `${ORIGIN}/mentions-legales`,
      locale: 'fr',
    });
    expect(mail.subject).toBe(
      'Votre audit de exemple.fr n’a pas pu aller au bout',
    );
    expect(mail.text).toContain('WAF ou HTTP 403');
    expect(mail.html).toContain('Relancer l’audit');
    expect(mail.html).toContain(href.replaceAll('&', '&amp;'));
    expect(linkLooksSafe(href)).toBe(true);
    expect(href).not.toMatch(/[?&](token|jeton|share)=/i);
  });

  it('échec EN injoignable', () => {
    expect(auditEndReasonOf('unreachable')).toBe('down');
    const mail = renderAuditEndMail({
      outcome: 'failed',
      domain: 'exemple.fr',
      reason: 'down',
      actionUrl: relaunchAuditUrl(ORIGIN, SITE),
      prefsUrl: `${ORIGIN}/compte`,
      legalUrl: `${ORIGIN}/mentions-legales`,
      locale: 'en',
    });
    expect(mail.subject).toBe(
      'Your audit of exemple.fr could not be completed',
    );
    expect(mail.text).toContain('unreachable');
    expect(mail.html).toContain('Rerun the audit');
  });
});

describe('envoi de l’e-mail de fin d’audit', () => {
  it('envoie une fois un audit manuel réussi', async () => {
    const { log, events } = logger();
    const mailer = mailerOf();
    const store = storeOf(record());
    const result = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    expect(result).toBe('sent');
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('owner@exemple.fr');
    expect(mailer.sent[0]?.replyTo).toBe('Audixio@outlook.fr');
    expect(mailer.sent[0]?.idempotencyKey).toBe(`audit-end/${AUDIT}`);
    expect(mailer.sent[0]?.subject).toContain('C (65/100)');
    expect(store.claims).toBe(1);
    expect(store.releases).toBe(0);
    expect(events).toContain('audit_end_email_sent');
  });

  it('n’envoie pas deux fois (idempotence)', async () => {
    const { log } = logger();
    const mailer = mailerOf();
    const store = storeOf(record());
    const first = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    const second = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    expect(first).toBe('sent');
    expect(second).toBe('already_sent');
    expect(mailer.sent).toHaveLength(1);
  });

  it('n’envoie pas si le réglage du compte est désactivé', async () => {
    const { log } = logger();
    const mailer = mailerOf();
    const store = storeOf(record({ notifyAuditEnd: false }));
    const result = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    expect(result).toBe('setting_off');
    expect(mailer.sent).toHaveLength(0);
    expect(store.claims).toBe(0);
  });

  it('journalise « envoi désactivé » si le drapeau est faux ou la clé absente', async () => {
    const mailer = mailerOf();
    const store = storeOf(record());
    const off = logger();
    const noFlag = await sendAuditEndEmail({
      auditId: AUDIT,
      env: { ...baseEnv, AUDIT_END_EMAIL_ENABLED: 'false' },
      logger: off.log,
      store,
      mailer,
    });
    expect(noFlag).toBe('disabled');
    expect(off.events).toContain('envoi désactivé');
    const missing = logger();
    const noKey = await sendAuditEndEmail({
      auditId: AUDIT,
      env: { ...baseEnv, RESEND_API_KEY: '' },
      logger: missing.log,
      store,
      mailer,
    });
    expect(noKey).toBe('disabled');
    expect(missing.events).toContain('envoi désactivé');
    expect(mailer.sent).toHaveLength(0);
    expect(store.claims).toBe(0);
  });

  it('ignore un audit programmé', async () => {
    const { log } = logger();
    const mailer = mailerOf();
    const store = storeOf(record({ trigger: 'schedule' }));
    const result = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    expect(result).toBe('scheduled');
    expect(mailer.sent).toHaveLength(0);
    expect(store.claims).toBe(0);
  });

  it('relâche la réserve si l’envoi échoue, pour réessayer', async () => {
    const { log, events } = logger();
    const store = storeOf(record());
    const mailer: TransactionalMailer = {
      async send() {
        throw new Error('resend_rejected');
      },
    };
    const result = await sendAuditEndEmail({
      auditId: AUDIT,
      env: baseEnv,
      logger: log,
      store,
      mailer,
    });
    expect(result).toBe('failed');
    expect(store.releases).toBe(1);
    expect(events).toContain('audit_end_email_failed');
  });
});
