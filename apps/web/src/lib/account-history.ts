export interface HistorySite {
  id: string;
  host: string;
  hosting: string;
}

export type HistorySource =
  | { kind: 'demo' }
  | { kind: 'empty' }
  | { kind: 'live'; sites: HistorySite[] };

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
 * Une liste vide ou de vrais sites remplace `monsite-exemple.fr`.
 */
export function historySource(sites: unknown): HistorySource {
  if (!Array.isArray(sites)) return { kind: 'demo' };
  const parsed = sites.flatMap((row) => {
    const parsedSite = asSite(row);
    return parsedSite ? [parsedSite] : [];
  });
  if (parsed.length === 0) return { kind: 'empty' };
  return { kind: 'live', sites: parsed };
}

/** Site du dernier audit terminé, sinon le premier de la liste. */
export function pickHistorySite(
  sites: readonly HistorySite[],
  auditedSiteId: string | null | undefined,
): HistorySite | null {
  const id = auditedSiteId?.trim() ?? '';
  if (id !== '') {
    const match = sites.find((site) => site.id === id);
    if (match) return match;
  }
  return sites[0] ?? null;
}

const SITE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Ligne `sites` lue pour l’identifiant demandé (ou rien). */
export type AskedSiteReader = (siteId: string) => Promise<unknown>;

/**
 * Site demandé par `?site=` s’il appartient au compte, sinon `null`.
 * Un identifiant mal formé ne part pas en requête.
 */
export async function askedHistorySite(
  asked: string,
  listed: readonly HistorySite[],
  read: AskedSiteReader,
): Promise<HistorySite | null> {
  const id = asked.trim();
  if (!SITE_ID.test(id)) return null;
  const known = listed.find((site) => site.id === id);
  if (known) return known;
  const rows = await read(id);
  const row = Array.isArray(rows) ? rows[0] : null;
  const site = asSite(row);
  return site?.id === id ? site : null;
}
