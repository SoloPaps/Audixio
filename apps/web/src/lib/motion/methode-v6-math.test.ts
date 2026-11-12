import { GRADE_THRESHOLDS, gradeForScore } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  CALC_DOMAINS,
  fill,
  gradeOf,
  levelOf,
  METHODE_THRESHOLDS,
  overall,
  STORY_RAIL,
} from './methode-v6-math.js';

describe('calculs de /methode v6', () => {
  it('suit le barème unique, seuil par seuil', () => {
    expect(METHODE_THRESHOLDS).toEqual(GRADE_THRESHOLDS);
    for (let score = 0; score <= 100; score += 1) {
      expect(gradeOf(score), String(score)).toBe(gradeForScore(score));
    }
  });

  it('D, E et F se lisent « problème »', () => {
    expect(levelOf('A')).toBe('A');
    expect(levelOf('C')).toBe('C');
    expect(['D', 'E', 'F'].map((g) => levelOf(g as 'D'))).toEqual([
      'P',
      'P',
      'P',
    ]);
  });

  it('moyenne à poids égaux, arrondie, null sans domaine compté', () => {
    expect(overall([])).toBeNull();
    expect(overall([72, 88, 64, 58, 67, 93, 70, 40])).toBe(69);
    const start = CALC_DOMAINS.filter((d) => d.on).map((d) => d.score);
    expect(overall(start)).toBe(75);
    expect(gradeOf(75)).toBe('C');
  });

  it('les exemples de la page tombent juste', () => {
    // Qualité technique : 3×1 + 2×0,5 + 2×0,5 + 1×1 + 1×0 = 6 points sur 9.
    expect(Math.round((100 * 6) / 9)).toBe(67);
    expect(gradeOf(67)).toBe('C');
    // Score d’un domaine : (3×1 + 2×0,5 + 1×0) ÷ 6.
    expect(Math.round((100 * (3 + 1 + 0)) / 6)).toBe(67);
    expect(gradeOf(69)).toBe('C');
    expect(gradeOf(72)).toBe('C');
  });

  it('six étapes lues, quatre repères sur le rail', () => {
    expect(STORY_RAIL).toEqual([0, 1, 1, 2, 3, 3]);
  });

  it('remplit un modèle en morceaux, sans HTML', () => {
    expect(
      fill('{n} donne {g}, {l}.', { n: 72, g: 'C', l: 'à améliorer' }, ['g']),
    ).toEqual([
      { text: '72' },
      { text: ' donne ' },
      { text: 'C', bold: true },
      { text: ', ' },
      { text: 'à améliorer' },
      { text: '.' },
    ]);
    expect(() => fill('{n}', {})).toThrow('paramètre manquant : n');
  });
});
