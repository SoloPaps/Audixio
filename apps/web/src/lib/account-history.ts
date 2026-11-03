export interface HistorySite {
  id: string;
  host: string;
  hosting: string;
}

export type HistorySource =
  | { kind: 'demo' }
  | { kind: 'empty' }
  | { kind: 'live'; site: HistorySite };

function asSite(value: unknown): HistorySite | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as { id?: unknown; host?: unknown; hosting?: unknown };
  if (typeof row.id !== 'string' || row.id === '') return null;
  if (typeof row.host !== 'string' || row.host === '') return null;
  const hosting =
    typeof row.hosting === 'string' && row.hosting !== ''
      ? row.hosting
      : 'other';
  return { id: row.id, host: row.host, hosting };
}

/**
 * La maquette statique ne reste que si la réponse n’est pas une liste.
 * Une liste vide ou un vrai site remplace `monsite-exemple.fr`.
 */
export function historySource(sites: unknown): HistorySource {
  if (!Array.isArray(sites)) return { kind: 'demo' };
  const site = sites.flatMap((row) => {
    const parsed = asSite(row);
    return parsed ? [parsed] : [];
  })[0];
  if (!site) return { kind: 'empty' };
  return { kind: 'live', site };
}
