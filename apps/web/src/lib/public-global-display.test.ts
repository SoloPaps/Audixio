import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/index.js';
import { publicGlobalDisplay } from './public-score.js';

describe('note globale sur /score', () => {
  it('affiche la note seulement quand elle est connue et que tous les domaines ouverts sont notés', () => {
    expect(publicGlobalDisplay(86, 5, 5)).toBe('score');
    expect(publicGlobalDisplay(65, 5, 5)).toBe('score');
  });

  it('garde le libellé #188 dès qu’il manque un domaine ouvert, même si une note existe', () => {
    expect(publicGlobalDisplay(null, 5, 5)).toBe('deferred');
    expect(publicGlobalDisplay(80, 3, 5)).toBe('deferred');
    expect(publicGlobalDisplay(null, 3, 5)).toBe('deferred');
    expect(fr['score.public.deferred']).toBe(
      'Note globale disponible dans le rapport complet',
    );
    expect(fr['score.empty']).toBe('—');
    expect(fr['verdict.untested']).toBe('Nous n’avons pas assez de mesures.');
    expect(fr['score.public.deferred']).not.toContain('—');
    expect(fr['score.public.deferred']).not.toBe(fr['verdict.untested']);
  });

  it('reste « non testé » si aucun domaine ouvert n’a de note', () => {
    expect(publicGlobalDisplay(null, 0, 5)).toBe('untested');
  });
});
