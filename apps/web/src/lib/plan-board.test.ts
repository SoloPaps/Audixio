import { describe, expect, it } from 'vitest';
import {
  compareTasks,
  detailAllowed,
  effortBand,
  quadrant,
} from './plan-board.js';

describe('plan d’action', () => {
  it('classe l’effort et les quadrants comme la maquette', () => {
    expect(effortBand(10)).toBe(1);
    expect(effortBand(20)).toBe(1);
    expect(effortBand(40)).toBe(2);
    expect(effortBand(null)).toBe(2);
    expect(quadrant(3, 1, 'todo')).toBe(0);
    expect(quadrant(3, 2, 'doing')).toBe(1);
    expect(quadrant(1, 1, 'todo')).toBe(2);
    expect(quadrant(1, 3, 'todo')).toBe(3);
    expect(quadrant(3, 1, 'done')).toBeNull();
  });

  it('trie par gravité puis par effort', () => {
    const crit = { tone: 'crit' as const, impact: 3, effort: 1 as const };
    const fix = { tone: 'fix' as const, impact: 3, effort: 2 as const };
    expect(compareTasks('prio', crit, fix)).toBeLessThan(0);
    expect(compareTasks('eff', fix, crit)).toBeGreaterThan(0);
  });

  it('masque le détail sensible tant que le site n’est pas vérifié', () => {
    expect(detailAllowed('securite', false, false)).toBe(false);
    expect(detailAllowed('vie_privee', true, true)).toBe(false);
    expect(detailAllowed('performance', false, false)).toBe(true);
    expect(detailAllowed('securite', false, true)).toBe(true);
    expect(detailAllowed('dns_email', false, false)).toBe(false);
  });
});
