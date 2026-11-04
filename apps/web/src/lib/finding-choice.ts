const CHOICES = new Set(['none', 'chk', 'fix', 'skip', 'check']);

/** Mémorise le choix d’action d’un constat. */
export function rememberChoice(
  raw: string | null,
  auditId: string,
  checkId: string,
  choice: string,
): string {
  void auditId;
  void checkId;
  void choice;
  return raw ?? '{}';
}

export function readChoice(
  raw: string | null,
  auditId: string,
  checkId: string,
): string | null {
  try {
    const parsed = JSON.parse(raw ?? '{}') as Record<
      string,
      Record<string, string>
    >;
    const value = parsed[auditId]?.[checkId];
    return typeof value === 'string' && CHOICES.has(value) ? value : null;
  } catch {
    return null;
  }
}
