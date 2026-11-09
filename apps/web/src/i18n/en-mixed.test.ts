import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// QA Mo 05/11 (B9, B10) : des libellés anglais gardaient des mots français
// (« Pourquoi surveiller your domains ? », « Question on un diagnostic de
// security »). Garde : aucun mot-outil français dans le catalogue anglais.

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

// Noms propres et adresses d’exemple, en français à dessein.
const ALLOWED = new Set([
  // Glose officielle conservée entre parenthèses, première occurrence / adresse.
  'mq.lg.364',
  'mq.lg.372',
  'mq.lg.373',
  'fix.securite.security_txt.generic.1', // URL d’exemple
]);

const FRENCH =
  /\b(de|des|du|un|une|les|et|pour|vos|votre|sur|avec|pas|est|pourquoi|vous|nous|dans|sans|leur|cette|ce|qui|que|au|aux|d’un|d’une)\b/i;

describe('catalogue anglais sans français mêlé', () => {
  it('aucun mot-outil français hors noms propres', () => {
    const mixed = Object.entries(en)
      .filter(([key]) => !ALLOWED.has(key))
      .filter(([, value]) => {
        const text = value.replace(/\{[^}]*\}/g, '');
        return FRENCH.test(text) || /[éèêàùçœ]/i.test(text);
      })
      .map(([key, value]) => `${key}: ${value}`);
    expect(mixed).toEqual([]);
  });

  it('B9 et B10 : libellés anglais', () => {
    expect(en['mq.sl.081']).toBe('Why monitor your domains?');
    expect(en['mq.co.154']).toBe('Question about a security audit');
  });
});
