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
 * L’animation de la maquette ne joue que pour l’aperçu `?maquette=1`.
 * Sans audit, la page reste vide. `?id=`, `?url=` et `?site=` attendent la mesure.
 */
export function progressSceneSimulates(search: string): boolean {
  return new URLSearchParams(search).get('maquette') === '1';
}

/** Vrai tant que l’adresse ne désigne ni un audit, ni l’aperçu maquette. */
export function progressEmpty(search: string): boolean {
  if (progressSceneSimulates(search)) return false;
  const params = new URLSearchParams(search);
  const present = (key: string): boolean =>
    (params.get(key)?.trim() ?? '') !== '';
  return !present('id') && !present('url') && !present('site');
}

/**
 * Lien du rapport. Sans audit, la page d’exemple : `/rapport` seul est introuvable.
 */
export function reportHrefFromSearch(search: string): string {
  const id = new URLSearchParams(search).get('id')?.trim() ?? '';
  if (AUDIT_ID.test(id)) return `/rapport?id=${encodeURIComponent(id)}`;
  return '/exemple-rapport';
}
