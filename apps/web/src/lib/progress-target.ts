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
 * La simulation de la maquette ne joue que sans audit réel.
 * `?id=`, `?url=` et `?site=` attendent la mesure. `?maquette=1` reste l’aperçu.
 */
export function progressSceneSimulates(search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get('maquette') === '1') return true;
  const present = (key: string): boolean =>
    (params.get(key)?.trim() ?? '') !== '';
  if (present('id') || present('url') || present('site')) return false;
  return true;
}

/**
 * Lien du rapport. Sans audit, la page d’exemple : `/rapport` seul est introuvable.
 */
export function reportHrefFromSearch(search: string): string {
  const id = new URLSearchParams(search).get('id')?.trim() ?? '';
  if (AUDIT_ID.test(id)) return `/rapport?id=${encodeURIComponent(id)}`;
  return '/exemple-rapport';
}
