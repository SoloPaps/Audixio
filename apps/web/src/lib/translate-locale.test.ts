import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { installPack } from '../i18n/pack.js';
import { localizeMeasured, translate } from './translate.js';

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

describe('mesures affichées selon la langue', () => {
  afterEach(() => {
    installPack(null);
  });

  it('laisse les typographies françaises hors pack anglais', () => {
    expect(localizeMeasured('poids', '1,5 Mo')).toBe('1,5 Mo');
    expect(localizeMeasured('grammes', 'moins de 0,01')).toBe('moins de 0,01');
  });

  it('passe les unités et décimales en anglais quand le pack est posé', () => {
    installPack(pack);
    expect(localizeMeasured('poids', '1,5 Mo')).toBe('1.5 MB');
    expect(localizeMeasured('poids', '320 ko')).toBe('320 kB');
    expect(localizeMeasured('secondes', '3,4')).toBe('3.4');
    expect(localizeMeasured('grammes', 'moins de 0,01')).toBe('less than 0.01');
    expect(localizeMeasured('site', 'exemple.fr')).toBe('exemple.fr');
    expect(translate('performance.poids.warn', { poids: '1,5 Mo' })).toContain(
      '1.5 MB',
    );
    expect(
      translate('performance.poids.warn', { poids: '1,5 Mo' }),
    ).not.toContain('Mo');
  });
});
