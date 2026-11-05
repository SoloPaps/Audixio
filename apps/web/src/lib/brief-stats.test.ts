import { describe, expect, it } from 'vitest';
import { type BriefMode, briefCount } from './brief-stats.js';
import type { CatalogStatus } from './report-model.js';

interface Row {
  id: string;
  catalogStatus: CatalogStatus;
}

function base(row: Row): BriefMode {
  if (row.catalogStatus === 'fail') return 'fix';
  if (row.catalogStatus === 'warn') return 'check';
  return 'skip';
}

describe('compteur du brief (retest C7)', () => {
  const pro: Row[] = [
    { id: 'a', catalogStatus: 'fail' },
    { id: 'b', catalogStatus: 'warn' },
    { id: 'c', catalogStatus: 'pass' },
  ];

  it('un contrôle réussi ne compte pas comme constat', () => {
    expect(briefCount(pro, base)).toEqual({
      fix: 1,
      check: 1,
      skip: 0,
      total: 2,
    });
  });

  it('un constat passé sur « Rien » reste compté, en ignoré', () => {
    const mode = (row: Row): BriefMode => (row.id === 'b' ? 'skip' : base(row));
    expect(briefCount(pro, mode)).toEqual({
      fix: 1,
      check: 0,
      skip: 1,
      total: 2,
    });
  });

  it('un contrôle réussi confié à l’assistant compte', () => {
    const mode = (row: Row): BriefMode =>
      row.id === 'c' ? 'check' : base(row);
    expect(briefCount(pro, mode).total).toBe(3);
  });
});
