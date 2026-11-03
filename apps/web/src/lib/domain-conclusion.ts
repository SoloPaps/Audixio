/** Conclusion affichée. Un domaine non testé n’en a pas. */
export function hubConclusion(input: {
  locked: boolean;
  score: number | null;
  summary: string;
  detail: string;
}): string | null {
  if (input.locked) return input.detail;
  if (input.score === null) return null;
  return input.summary;
}

export function shownConclusion(level: string, text: string): string | null {
  if (level === 'untested') return null;
  return text;
}
