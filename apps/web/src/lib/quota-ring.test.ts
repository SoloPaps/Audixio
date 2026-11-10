import { describe, expect, it } from 'vitest';
import { quotaFillDash, quotaRatio } from './quota-ring.js';

describe('cercles de quota', () => {
  it('suit used/limit : moitié, vide, plein', () => {
    expect(quotaRatio(1, 2)).toBe(0.5);
    expect(quotaRatio(0, 1)).toBe(0);
    expect(quotaRatio(2, 2)).toBe(1);
    expect(quotaFillDash(1, 2)).toBe('50 50');
    expect(quotaFillDash(0, 1)).toBe('0 100');
    expect(quotaFillDash(2, 2)).toBe('100 0');
  });

  it('un plafond illimité ne simule pas un anneau plein', () => {
    expect(quotaRatio(0, null)).toBe(0);
    expect(quotaRatio(3, null)).toBe(0);
    expect(quotaFillDash(3, null)).toBe('0 100');
  });
});
