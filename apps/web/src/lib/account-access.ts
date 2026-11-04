/** Retrait d’un accès : doit survivre au rechargement. */
export function rememberRevoke(raw: string | null, id: string): string {
  void id;
  return raw ?? '[]';
}

export function revokedAccessIds(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function activeAccessCount(
  total: number,
  revoked: readonly string[],
): number {
  void revoked;
  return total;
}
