import { describe, expect, it } from 'vitest';
import { REPORT_DOMAINS } from './domains.js';
import {
  HOME_EXAMPLE_ROWS,
  HOME_EXAMPLE_SCORE,
  HOME_OFFER_SCORES,
} from './home-example.js';
import { gradeForScore } from './grade.js';
import { levelForScore } from './score.js';

describe('exemple d’accueil', () => {
  it('fixe la jauge à 66 (lettre C sur les deux barèmes) et deux lignes de formes différentes', () => {
    expect(HOME_EXAMPLE_SCORE).toBe(66);
    expect(levelForScore(HOME_EXAMPLE_SCORE)).toBe('improve');
    // Méthode publiée : C = 50 à 69. Moteur : C = 65 à 79.
    expect(gradeForScore(HOME_EXAMPLE_SCORE)).toBe('C');
    expect(HOME_EXAMPLE_SCORE).toBeLessThan(70);
    expect(HOME_EXAMPLE_ROWS).toEqual([
      { key: 'domain.seo.plain', score: 64 },
      { key: 'home.example.https', score: 86 },
    ]);
    expect(levelForScore(64)).toBe('improve');
    expect(levelForScore(86)).toBe('good');
    expect(Object.keys(HOME_OFFER_SCORES)).toEqual([...REPORT_DOMAINS]);
  });
});
