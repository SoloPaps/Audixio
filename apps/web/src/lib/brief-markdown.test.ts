import { describe, expect, it } from 'vitest';
import { renderBriefMarkdown } from './brief-markdown.js';

const SECRET = 'JETON-MESURE-SECRET';

describe('markdown du brief', () => {
  it('préfixe le brief partiel et retire les domaines verrouillés', () => {
    const file = renderBriefMarkdown({
      level: 'partiel',
      url: 'https://exemple.fr',
      at: '2026-10-23T12:30:00.000Z',
      items: [
        {
          checkId: 'performance.lcp',
          title: 'Image lourde',
          proof: 'La première image pèse trop.',
          mode: 'verif',
        },
        {
          checkId: 'securite.hsts',
          title: 'HSTS absent',
          proof: SECRET,
          mode: 'fix',
        },
        {
          checkId: 'vie_privee.cookies',
          title: 'Cookie tiers',
          proof: 'Un cookie est posé.',
          mode: 'fix',
        },
        {
          checkId: 'dns_email.spf',
          title: 'SPF absent',
          proof: 'Pas d’enregistrement.',
          mode: 'verif',
        },
      ],
    });
    expect(
      file.startsWith('Audixio Brief — PARTIEL (Site non vérifié)\n'),
    ).toBe(true);
    expect(file).toContain('Image lourde');
    expect(file).toContain('https://exemple.fr');
    expect(file).not.toContain('HSTS');
    expect(file).not.toContain('securite.hsts');
    expect(file).not.toContain('vie_privee');
    expect(file).not.toContain('dns_email');
    expect(file).not.toContain(SECRET);
    expect(file).not.toContain('Cookie');
    expect(file.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
      true,
    );
  });

  it('préfixe le brief complet et garde le constat sensible demandé', () => {
    const file = renderBriefMarkdown({
      level: 'complet',
      url: 'https://exemple.fr',
      at: null,
      items: [
        {
          checkId: 'securite.hsts',
          title: 'En-tête de sécurité absent',
          proof: 'La réponse ne fixe pas la durée.',
          mode: 'fix',
        },
      ],
    });
    expect(file.startsWith('Audixio Brief — COMPLET (Site vérifié)\n')).toBe(
      true,
    );
    expect(file).toContain('En-tête de sécurité absent');
    expect(file).toContain('securite.hsts');
    expect(file).not.toContain(SECRET);
  });
});
