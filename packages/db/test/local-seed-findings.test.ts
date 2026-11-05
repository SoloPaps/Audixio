import { describe, expect, it } from 'vitest';
import { seedFindings } from '../src/local-seed.js';

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
});
