export type HistorySpan = '6m' | '1y' | 'all';

const DAY = 86_400_000;

/** Fenêtre de l’historique. 6 mois et 1 an ne gardent pas les mêmes points. */
export function filterHistoryPoints<T extends { at: string }>(
  points: readonly T[],
  span: HistorySpan,
  now: number,
): T[] {
  if (span === 'all') return [...points];
  const min = now - (span === '6m' ? 183 : 365) * DAY;
  return points.filter((point) => {
    const at = Date.parse(point.at);
    return Number.isFinite(at) && at >= min;
  });
}

export function historySpanOf(index: number): HistorySpan {
  if (index <= 0) return '6m';
  if (index === 1) return '1y';
  return 'all';
}
