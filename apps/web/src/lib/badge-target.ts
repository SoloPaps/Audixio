/**
 * Lien du badge : le partage public.
 * Un visiteur sans compte n’a pas de lien public et son rapport n’est pas
 * lisible par un tiers : le badge renvoie vers l’accueil d’Audixio.
 * Un compte sans lien public n’a pas encore de cible : le badge demande de
 * créer le lien d’abord (décision du propriétaire, 6 nov.), jamais /rapport,
 * qui est privé.
 */
export function badgeTargetHref(input: {
  origin: string;
  shareToken: string | null;
  guest?: boolean;
}): string | null {
  if (input.guest) return `${input.origin}/`;
  if (input.shareToken)
    return `${input.origin}/partage/${encodeURIComponent(input.shareToken)}`;
  return null;
}

/** Jeton d’une adresse `/partage/<jeton>` rendue par POST /api/liens. */
export function shareTokenOf(url: string): string | null {
  const match = /^\/partage\/([^/?#]+)\/?$/.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Message d’échec de la création du lien public. Le plafond du plan gratuit
 * (un lien actif) répond 429 `user_limit` : la clé générique de cette erreur
 * parle des audits du jour, le badge nomme donc le plafond des liens.
 */
export function linkErrorKey(
  status: number | null,
  body: unknown,
): 'badge.linkLimit' | 'share.error' {
  return isLinkLimit(status, body) ? 'badge.linkLimit' : 'share.error';
}

/** Vrai si POST /api/liens a refusé pour le plafond d’un lien du plan gratuit. */
export function isLinkLimit(status: number | null, body: unknown): boolean {
  const code =
    body && typeof body === 'object' ? (body as { error?: unknown }).error : '';
  return status === 429 && code === 'user_limit';
}
