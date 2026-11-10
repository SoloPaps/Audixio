const KEY_OK = /^[a-z0-9-]{1,80}$/i;

function parse(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string' && KEY_OK.test(item))
      : [];
  } catch {
    return [];
  }
}

/** Retrait d’un accès : la liste survit au rechargement. */
export function rememberRevoke(raw: string | null, id: string): string {
  const ids = new Set(parse(raw));
  if (KEY_OK.test(id)) ids.add(id);
  return JSON.stringify([...ids]);
}

export function revokedAccessIds(raw: string | null): string[] {
  return parse(raw);
}

export function activeAccessCount(
  total: number,
  revoked: readonly string[],
): number {
  return Math.max(0, total - revoked.length);
}

export interface ReportLinkRow {
  id: string;
  auditId: string;
  token: string;
  kind: string | null;
  visibility: string;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ActiveShare {
  id: string;
  host: string;
  kind: 'public' | 'team';
  urlPath: string;
  createdAt: string;
}

const SHARE_TOKEN = /^[0-9a-f]{32}$/;

function shareKind(value: string | null): 'public' | 'team' | null {
  if (value === 'public' || value === 'team') return value;
  return null;
}

/** Liens encore ouverts. Révoqués, expirés ou sans hôte ne comptent pas. */
export function activeShareLinks(
  reports: readonly ReportLinkRow[],
  hosts: ReadonlyMap<string, string>,
  now: number,
): ActiveShare[] {
  const links: ActiveShare[] = [];
  for (const row of reports) {
    const kind = shareKind(row.kind);
    const host = hosts.get(row.auditId);
    if (!kind || !host) continue;
    if (row.visibility !== 'link' || row.revokedAt !== null) continue;
    if (!SHARE_TOKEN.test(row.token)) continue;
    if (row.expiresAt !== null) {
      const end = Date.parse(row.expiresAt);
      if (!Number.isFinite(end) || end <= now) continue;
    }
    links.push({
      id: row.id,
      host,
      kind,
      urlPath: `/partage/${row.token}`,
      createdAt: row.createdAt,
    });
  }
  return links;
}

/** Toast de copie : le lien public n’est pas un lien équipe. */
export function shareCopiedKey(
  kind: 'public' | 'team',
): 'mq.co.078' | 'mq.co.078.public' {
  return kind === 'team' ? 'mq.co.078' : 'mq.co.078.public';
}
