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
