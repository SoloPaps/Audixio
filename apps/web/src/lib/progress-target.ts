const AUDIT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Domaine demandé dans l’adresse de la progression. */
export function hostFromProgressQuery(search: string): string | null {
  const raw = new URLSearchParams(search).get('url')?.trim() ?? '';
  if (raw === '') return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

/**
 * Lien du rapport. Sans audit, la page d’exemple : `/rapport` seul est introuvable.
 */
export function reportHrefFromSearch(search: string): string {
  const id = new URLSearchParams(search).get('id')?.trim() ?? '';
  if (AUDIT_ID.test(id)) return `/rapport?id=${encodeURIComponent(id)}`;
  return '/exemple-rapport';
}
