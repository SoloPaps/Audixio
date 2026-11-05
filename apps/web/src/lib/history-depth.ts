/** Miroir UI de la RLS : profondeur 1 par site, sauf Pro. */
export function historyRowsForPlan<
  T extends { id: string; created_at: string },
>(rows: readonly T[], plan: string | null): T[] {
  if (plan === 'pro') return [...rows];
  return [...rows]
    .sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 1);
}
