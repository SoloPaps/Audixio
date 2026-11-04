const CHOICES = new Set(['none', 'chk', 'fix', 'skip', 'check']);

function parse(raw: string | null): Record<string, Record<string, string>> {
  try {
    const value = JSON.parse(raw ?? '{}') as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

/** Mémorise le choix d’action d’un constat pour cet audit. */
export function rememberChoice(
  raw: string | null,
  auditId: string,
  checkId: string,
  choice: string,
): string {
  const parsed = parse(raw);
  const audit = { ...(parsed[auditId] ?? {}) };
  if (CHOICES.has(choice)) audit[checkId] = choice;
  return JSON.stringify({ ...parsed, [auditId]: audit });
}

export function readChoice(
  raw: string | null,
  auditId: string,
  checkId: string,
): string | null {
  const value = parse(raw)[auditId]?.[checkId];
  return typeof value === 'string' && CHOICES.has(value) ? value : null;
}
