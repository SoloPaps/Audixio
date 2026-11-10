import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/index.js';
import { publicGlobalDisplay } from './public-score.js';

describe('M6 — note globale absente par conception sur /score', () => {
  it('propose le libellé différé si des domaines sont notés, sans « — » ni manque de mesures', () => {
    expect(publicGlobalDisplay(null, 5)).toBe('deferred');
    expect(publicGlobalDisplay(86, 5)).toBe('score');
    expect(publicGlobalDisplay(null, 0)).toBe('untested');
    expect(fr['score.public.deferred']).toBe(
      'Note globale disponible dans le rapport complet',
    );
    expect(fr['score.empty']).toBe('—');
    expect(fr['verdict.untested']).toBe('Nous n’avons pas assez de mesures.');
    expect(fr['score.public.deferred']).not.toContain('—');
    expect(fr['score.public.deferred']).not.toBe(fr['verdict.untested']);
  });
});
