import type { CatalogStatus } from './report-model.js';

export type BriefMode = 'skip' | 'check' | 'fix';

export interface BriefCount {
  fix: number;
  check: number;
  skip: number;
  total: number;
}

/**
 * Compte les constats comme le rapport : un contrôle réussi n’en est pas un,
 * sauf si l’utilisateur le confie quand même à l’assistant (retest C7).
 */
export function briefCount<T extends { catalogStatus: CatalogStatus }>(
  rows: readonly T[],
  modeOf: (row: T) => BriefMode,
): BriefCount {
  const out: BriefCount = { fix: 0, check: 0, skip: 0, total: 0 };
  for (const row of rows) {
    const mode = modeOf(row);
    const detected =
      row.catalogStatus === 'fail' || row.catalogStatus === 'warn';
    if (!detected && mode === 'skip') continue;
    out.total += 1;
    out[mode] += 1;
  }
  return out;
}
