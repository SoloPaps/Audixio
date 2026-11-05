import { describe, expect, it } from 'vitest';
import { seedDomainScores, seedFindings } from '../src/local-seed.js';

describe('constats du seed local', () => {
  it('une note de 86 a des constats et des tâches, pas 0', () => {
    const open = seedFindings(86).filter((item) => item.status !== 'pass');
    expect(open.length).toBeGreaterThan(0);
  });

  it('moins la note est haute, plus il y a de constats', () => {
    const count = (score: number) =>
      seedFindings(score).filter((item) => item.status !== 'pass').length;
    expect(count(64)).toBeGreaterThan(count(86));
    expect(count(100)).toBe(0);
  });

  it('retest C7 : le 86/100 Pro et le 72/100 gratuit ont 4 constats', () => {
    const open = (score: number) =>
      seedFindings(score).filter((item) => item.status !== 'pass');
    expect(open(86)).toHaveLength(4);
    expect(open(72)).toHaveLength(4);
    expect(new Set(open(64).map((item) => item.checkId)).size).toBe(
      open(64).length,
    );
  });

  it('retest C15 : notes par domaine distinctes, bonnes sans constat', () => {
    for (const score of [64, 72, 78, 86, 100]) {
      const scores = seedDomainScores(score);
      const values = Object.values(scores);
      expect(new Set(values).size).toBe(values.length);
      const open = new Set(
        seedFindings(score)
          .filter((item) => item.status !== 'pass')
          .map((item) => item.domain),
      );
      for (const [domain, value] of Object.entries(scores)) {
        if (open.has(domain as keyof typeof scores)) {
          expect(value).toBeLessThan(score);
        } else {
          expect(value).toBeGreaterThanOrEqual(80);
        }
      }
    }
  });
});
