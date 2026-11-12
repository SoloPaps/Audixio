import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lintText } from '../../../scripts/copy-lint.js';
import { mailCopy } from '../src/copy.js';
import { mailCopyEn } from '../src/copy-en.js';
import { renderDigest } from '../src/mail.js';
import {
  mailGrade,
  renderRecapMail,
  renderSignupMail,
  supabaseSignupTemplate,
} from '../src/mail-templates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
/** Fichier relu tel que commité : un clone en CRLF (Windows) reste comparable. */
const readLf = (rel: string) =>
  readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/gu, '\n');

describe('gabarits e-mail', () => {
  it('aligne la lettre sur le barème produit', () => {
    expect(mailGrade(95)).toBe('A');
    expect(mailGrade(80)).toBe('B');
    expect(mailGrade(70)).toBe('C');
    expect(mailGrade(50)).toBe('D');
    expect(mailGrade(35)).toBe('E');
    expect(mailGrade(10)).toBe('F');
    expect(mailGrade(null)).toBeNull();
  });

  it('rend le récap en tableau, styles inline, et une version texte', () => {
    const mail = renderDigest({
      sites: [
        {
          label: '<script>',
          host: 'exemple.example',
          score: 80,
          checks: 100,
          failures: 2,
          openIncident: true,
        },
      ],
      appUrl: 'https://audigy.test',
      unsubscribeUrl: 'https://audigy.test/api/unsubscribe?user=1&token=ab',
    });
    expect(mail.subject).toBe('Votre récap du lundi');
    expect(mail.text).toContain('98 %');
    expect(mail.text).toContain('Un incident est en cours.');
    expect(mail.text).not.toContain('<table');
    expect(mail.html).toContain('<table role="presentation"');
    expect(mail.html).toContain('style="');
    expect(mail.html).toContain('>B<');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<script');
    expect(mail.html).not.toMatch(/https?:\/\/[^"']+\.(png|gif|js)/u);
  });

  it('distingue la semaine sans changement', () => {
    const mail = renderRecapMail({
      mode: 'steady',
      cards: [
        {
          grade: 'C',
          host: 'monsite-exemple.fr',
          delta: { label: 'inchangé', tone: 'eq' },
          items: [],
        },
      ],
      reportUrl: 'https://audixio.fr/rapport',
      prefsUrl: 'https://audixio.fr/compte/alertes',
      legalUrl: 'https://audixio.fr/mentions-legales',
      unsubscribeUrl: 'https://audixio.fr/compte/alertes',
      logoUrl: '/marque/logo-pc.svg',
    });
    expect(mail.subject).toBe('Rien n’a changé cette semaine');
    expect(mail.html).toContain('inchangé');
    expect(mail.text).toContain('monsite-exemple.fr');
  });

  it('confirme l’inscription comme le fichier envoyé par GoTrue', () => {
    const built = supabaseSignupTemplate('{{ .SiteURL }}');
    const html = readLf('supabase/templates/confirmation.html');
    const text = readLf('supabase/templates/confirmation.txt');
    expect(html).toBe(built.html);
    expect(text).toBe(built.text);
    expect(built.html).toContain(
      '{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup',
    );
    expect(built.html).toContain('Code : {{ .Token }}');
    expect(built.html).toContain('Confirmer mon adresse');
    expect(built.text).toContain('Confirmer mon adresse');
  });

  it('couvre chaque clé française en anglais, sans texte interdit', () => {
    for (const key of Object.keys(mailCopy)) {
      const line = mailCopyEn[key as keyof typeof mailCopy];
      expect(line, key).toBeTruthy();
      expect(
        lintText(line ?? '', key).filter((issue) => issue.level === 'error'),
      ).toEqual([]);
    }
  });

  it('garde le lien de confirmation dans le texte', () => {
    const mail = renderSignupMail({
      confirmUrl: 'https://audixio.fr/email-confirme?jeton=8f3a',
      prefsUrl: 'https://audixio.fr/compte/alertes',
      legalUrl: 'https://audixio.fr/mentions-legales',
      unsubscribeUrl: 'https://audixio.fr/compte/alertes',
      logoUrl: '/marque/logo-pc.svg',
    });
    expect(mail.text).toContain('https://audixio.fr/email-confirme?jeton=8f3a');
    expect(mail.html).toContain('Bienvenue sur Audixio');
  });
});

describe('e-mails selon la locale du compte', () => {
  it('rend le récap et l’alerte en anglais quand locale=en', async () => {
    const { renderAlert } = await import('../src/mail.js');
    const recap = renderRecapMail({
      mode: 'change',
      cards: [
        {
          grade: 'B',
          host: 'exemple.example',
          items: ['One new issue'],
        },
      ],
      reportUrl: 'https://audigy.test',
      prefsUrl: 'https://audigy.test/compte/alertes',
      legalUrl: 'https://audigy.test/mentions-legales',
      unsubscribeUrl: 'https://audigy.test/api/unsubscribe?user=1&token=ab',
      logoUrl: 'https://audigy.test/marque/logo-pc.svg',
      locale: 'en',
    });
    expect(recap.subject).toBe('Your Monday recap');
    expect(recap.html).toContain('lang="en"');
    expect(recap.subject).not.toBe('Votre récap du lundi');

    const alert = renderAlert({
      kind: 'site_down',
      payload: { dedup: 'd1', site: 'exemple.example' },
      appUrl: 'https://audigy.test',
      unsubscribeUrl: 'https://audigy.test/api/unsubscribe?user=1&token=ab',
      locale: 'en',
    });
    expect(alert?.subject).toBe('Your site is not responding');
    expect(alert?.html).toContain('lang="en"');
    expect(alert?.text).toContain('failed two checks');
  });

  it('reste en français par défaut, après un rendu anglais', () => {
    const again = renderRecapMail({
      mode: 'change',
      cards: [
        {
          grade: 'B',
          host: 'exemple.example',
          items: ['x'],
        },
      ],
      reportUrl: 'https://audigy.test',
      prefsUrl: 'https://audigy.test/compte/alertes',
      legalUrl: 'https://audigy.test/mentions-legales',
      unsubscribeUrl: 'https://audigy.test/api/unsubscribe?user=1&token=ab',
      logoUrl: 'https://audigy.test/marque/logo-pc.svg',
    });
    expect(again.subject).toBe('Votre récap du lundi');
    expect(again.html).toContain('lang="fr"');
  });
});
