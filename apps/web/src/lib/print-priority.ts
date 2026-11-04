/** Titre de la page priorités : la liste vide ne s’appelle pas « Les 5 priorités ». */
export function printPriorityTitle(
  count: number,
  filled: string,
  empty: string,
): string {
  return count === 0 ? empty : filled;
}
