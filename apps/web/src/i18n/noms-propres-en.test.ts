import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const fr = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-fr.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const KEYS = [
  'mq.lg.013',
  'mq.lg.214',
  'mq.lg.363',
  'mq.lg.364',
  'mq.lg.366',
  'mq.lg.369',
  'mq.lg.372',
  'mq.lg.373',
  'mq.lg.374',
] as const;

describe('noms propres officiels en anglais', () => {
  it('laisse le français inchangé', () => {
    expect(fr['mq.lg.013']).toBe('Audixio Observatoire Numérique');
    expect(fr['mq.lg.214']).toBe(
      'Éditeur particulier autonome — Audixio Observatoire Numérique (pôle Éthique & Inclusion).',
    );
    expect(fr['mq.lg.363']).toBe('Défenseur des droits');
    expect(fr['mq.lg.372']).toBe('Le Défenseur des droits');
    expect(fr['mq.lg.373']).toBe('Libre réponse 71120');
    expect(fr['mq.lg.374']).toBe('75342 Paris CEDEX 07');
  });

  it('traduit les trois noms, avec glose officielle sans doublon', () => {
    expect(en['mq.lg.013']).toBe('Audixio Digital Observatory');
    expect(en['mq.lg.214']).toBe(
      'Independent individual publisher — Audixio Digital Observatory (Ethics & Inclusion unit).',
    );
    expect(en['mq.lg.363']).toBe('Defender of Rights');
    expect(en['mq.lg.364']).toBe(
      'If you reported an accessibility issue to us without getting a satisfactory answer, you can refer the matter to the Defender of Rights (Défenseur des droits) in one of the following ways:',
    );
    expect(en['mq.lg.366']).toBe(
      'Refer the matter to the Defender of Rights on its official website.',
    );
    expect(en['mq.lg.369']).toBe(
      'Meet a Defender of Rights delegate near you, free of charge.',
    );
    expect(en['mq.lg.372']).toBe('Defender of Rights (Défenseur des droits)');
    expect(en['mq.lg.373']).toBe('Freepost (Libre réponse 71120)');
    expect(en['mq.lg.374']).toBe('75342 Paris CEDEX 07');
  });

  it('n’emploie plus les formes françaises nues ni l’ancienne glose', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, key).not.toContain('Audixio Observatoire Numérique');
      expect(value, key).not.toContain('French Rights Defender');
      if (value.includes('Libre réponse')) {
        expect(value, key).toContain('Freepost (Libre réponse 71120)');
      }
      if (value.includes('Défenseur des droits')) {
        expect(value, key).toMatch(
          /Defender of Rights \(Défenseur des droits\)/,
        );
        expect(value, key).not.toMatch(/The Défenseur des droits/);
      }
    }
    for (const key of KEYS) {
      expect(en[key], key).toBeTruthy();
    }
  });
});
