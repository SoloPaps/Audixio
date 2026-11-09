/**
 * Lien du badge : partage public, sinon le rapport de cet audit.
 * Un visiteur sans compte n’a pas de lien public et son rapport n’est pas
 * lisible par un tiers : le badge renvoie vers l’accueil d’Audixio.
 */
export function badgeTargetHref(input: {
  origin: string;
  shareToken: string | null;
  auditId: string;
  guest?: boolean;
}): string {
  if (input.guest) return `${input.origin}/`;
  if (input.shareToken)
    return `${input.origin}/partage/${encodeURIComponent(input.shareToken)}`;
  return `${input.origin}/rapport?id=${encodeURIComponent(input.auditId)}`;
}
