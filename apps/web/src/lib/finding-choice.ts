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

export function briefSelectionRow(input: {
  userId: string;
  auditId: string;
  findingId: string;
  choice: 'none' | 'chk' | 'fix';
  at: string;
}): {
  user_id: string;
  audit_id: string;
  finding_id: string;
  choice: 'none' | 'chk' | 'fix';
  updated_at: string;
} {
  return {
    user_id: input.userId,
    audit_id: input.auditId,
    finding_id: input.findingId,
    choice: input.choice,
    updated_at: input.at,
  };
}

export function readChoice(
  raw: string | null,
  auditId: string,
  checkId: string,
): string | null {
  const value = parse(raw)[auditId]?.[checkId];
  return typeof value === 'string' && CHOICES.has(value) ? value : null;
}

export type SavedChoice = 'none' | 'chk' | 'fix';

/**
 * Clé d’un constat dans `brief_selections` : son `checkId`. Le rapport donne
 * aux constats un identifiant `checkId-N` (rang dans l’audit) ; un `checkId`
 * ne contient jamais de tiret, le rang se retire sans ambiguïté.
 */
export function choiceKey(findingId: string): string {
  return findingId.replace(/-\d+$/u, '');
}

/**
 * Choix enregistrés d’un audit, par `checkId`. Les anciennes lignes écrites
 * avec le rang (`checkId-N`) comptent pour le même constat ; la plus récente
 * l’emporte, pour que /brief et /domaine affichent le même choix.
 */
export function savedChoices(
  rows: readonly {
    finding_id?: unknown;
    choice?: unknown;
    updated_at?: unknown;
  }[],
): Record<string, SavedChoice> {
  const stamp = (row: { updated_at?: unknown }): string =>
    typeof row.updated_at === 'string' ? row.updated_at : '';
  const ordered = [...rows].sort((a, b) =>
    stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0,
  );
  const saved: Record<string, SavedChoice> = {};
  for (const row of ordered) {
    const choice = row.choice;
    if (typeof row.finding_id !== 'string') continue;
    if (choice !== 'none' && choice !== 'chk' && choice !== 'fix') continue;
    saved[choiceKey(row.finding_id)] = choice;
  }
  return saved;
}
