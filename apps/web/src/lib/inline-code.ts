/** Segment de texte d’une étape : prose ou code entre backticks. */
export interface InlineSegment {
  code: boolean;
  text: string;
}

/**
 * Découpe une étape Markdown en segments texte / code (`…`).
 * Aucun HTML n’est produit : le rendu crée des nœuds texte échappés.
 * Un backtick sans fermeture reste du texte.
 */
export function splitInlineCode(input: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  const re = /`([^`\n]+)`/gu;
  let last = 0;
  for (const match of input.matchAll(re)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ code: false, text: input.slice(last, start) });
    out.push({ code: true, text: match[1] ?? '' });
    last = start + match[0].length;
  }
  if (last < input.length) out.push({ code: false, text: input.slice(last) });
  return out;
}
