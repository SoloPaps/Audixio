/**
 * Titre de la section priorités de l’impression. Le nombre affiché est celui
 * des priorités réellement listées (QA Mo B5) ; `filled` reçoit déjà ce
 * nombre (`pdf.prio.title`, `{n}`), `one` sert pour une seule priorité.
 */
export function printPriorityTitle(
  count: number,
  filled: string,
  empty: string,
  one: string = filled,
): string {
  if (count === 0) return empty;
  return count === 1 ? one : filled;
}
