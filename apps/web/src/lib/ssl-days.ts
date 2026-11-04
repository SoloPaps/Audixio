const SSL_DAYS = new Set([7, 14, 30, 60]);

/** Jours d’alerte SSL : la valeur choisie, pas le premier chiffre du libellé. */
export function sslWarnDays(input: { selected: string; text: string }): number {
  const selected = Number(input.selected);
  if (SSL_DAYS.has(selected)) return selected;
  const fallback = Number(input.text.match(/\d+/)?.[0] ?? 14);
  return SSL_DAYS.has(fallback) ? fallback : 14;
}

/** Valeur à remettre dans le select, y compris 14. */
export function sslSelectValue(days: number): string | null {
  return SSL_DAYS.has(days) ? String(days) : null;
}
