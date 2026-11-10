import { describe, expect, it } from 'vitest';
import { linkSlotsUsed, peutCreerLien } from '../src/index.js';

describe('M4 — même quota pour publications et liens de partage', () => {
  it('refuse un second occupant en gratuit et laisse le Pro illimité', () => {
    expect(linkSlotsUsed(1, 0)).toBe(1);
    expect(linkSlotsUsed(0, 1)).toBe(1);
    expect(linkSlotsUsed(1, 1)).toBe(2);
    expect(peutCreerLien('free', linkSlotsUsed(1, 0))).toBe(false);
    expect(peutCreerLien('free', linkSlotsUsed(0, 1))).toBe(false);
    expect(peutCreerLien('free', linkSlotsUsed(0, 0))).toBe(true);
    expect(peutCreerLien('pro', linkSlotsUsed(10, 50))).toBe(true);
  });
});
