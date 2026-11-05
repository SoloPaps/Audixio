/** Mois du premier audit (« décembre 2025 » / « December 2025 »), fuseau Europe/Paris. */
export function historySince(
  points: readonly { at: string }[],
  locale: 'fr' | 'en',
): string | null {
  const times = points
    .map((point) => Date.parse(point.at))
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(Math.min(...times)));
}
