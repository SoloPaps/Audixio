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
    const html = readFileSync(
      join(ROOT, 'supabase/templates/confirmation.html'),
      'utf8',
    );
    const text = readFileSync(
      join(ROOT, 'supabase/templates/confirmation.txt'),
      'utf8',
    );
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
