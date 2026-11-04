/** Jours d’alerte SSL lus sur le formulaire Pro. */
export function sslWarnDays(input: { selected: string; text: string }): number {
  return Number(input.text.match(/\d+/)?.[0] ?? 14);
}

/** Valeur à remettre dans le select. `null` : ne pas y toucher. */
export function sslSelectValue(days: number): string | null {
  if (days === 14) return null;
  return String(days);
}
