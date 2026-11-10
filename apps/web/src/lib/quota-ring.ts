/**
 * Remplissage d’un cercle de quota : used/limit, entre 0 et 1.
 * Un plafond illimité (compte Pro, liens) ne doit jamais afficher un faux
 * anneau plein : le ratio vaut 0, l’état se lit dans le libellé.
 */
export function quotaRatio(used: number, limit: number | null): number {
  if (limit === null) return 0;
  if (limit <= 0) return 0;
  const safeUsed = Math.max(0, used);
  return Math.min(1, safeUsed / limit);
}

/** Trait SVG (pathLength 100) : « 50 50 » pour 1/2, « 0 100 » pour vide. */
export function quotaFillDash(used: number, limit: number | null): string {
  const filled = Math.round(quotaRatio(used, limit) * 100);
  return `${filled} ${100 - filled}`;
}
