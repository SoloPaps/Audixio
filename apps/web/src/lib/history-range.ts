export type HistorySpan = '6m' | '1y' | 'all';

/** Fenêtre de l’historique. */
export function filterHistoryPoints<T extends { at: string }>(
  points: readonly T[],
  span: HistorySpan,
  now: number,
): T[] {
  void span;
  void now;
  return [...points];
}

export function historySpanOf(index: number): HistorySpan {
  if (index <= 0) return '6m';
  if (index === 1) return '1y';
  return 'all';
}
