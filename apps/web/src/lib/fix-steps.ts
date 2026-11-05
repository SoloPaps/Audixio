/**
 * Étapes numérotées et bloc copiable d’une variante de fiche.
 * `snippets[i]` : bloc de code qui suit l’étape i (en-tête à ajouter…),
 * sinon `null`. Absent si la variante n’a aucun bloc.
 */
export function stepsFromVariant(body: string): {
  steps: string[];
  code?: string;
  snippets?: (string | null)[];
} {
  const fence = /```[^\n]*\n([\s\S]*?)```/u.exec(body);
  const code = fence?.[1]?.trim();
  const steps: string[] = [];
  const snippets: (string | null)[] = [];
  const parts = body.split(/(```[^\n]*\n[\s\S]*?```)/u);
  for (const part of parts) {
    const block = /^```[^\n]*\n([\s\S]*?)```$/u.exec(part);
    if (block) {
      const text = block[1]?.replace(/\s+$/u, '') ?? '';
      const at = steps.length - 1;
      if (text.trim() === '' || at < 0) continue;
      const prev = snippets[at];
      snippets[at] = prev ? `${prev}\n${text}` : text;
      continue;
    }
    for (const raw of part.split('\n')) {
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) continue;
      const numbered = /^\d+\.\s+(.+)$/u.exec(line);
      steps.push(numbered?.[1] ?? line);
      snippets.push(null);
    }
  }
  const out: { steps: string[]; code?: string; snippets?: (string | null)[] } =
    { steps };
  if (code) out.code = code;
  if (snippets.some((item) => item !== null)) out.snippets = snippets;
  return out;
}
