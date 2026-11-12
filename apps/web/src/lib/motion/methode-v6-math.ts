/**
 * Calculs de /methode v6, partagés par le rendu serveur et le navigateur.
 * Le barème suit GRADE_THRESHOLDS (@audigy/db) : le test unitaire le vérifie.
 */

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Level = 'A' | 'B' | 'C' | 'P';

export const METHODE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 65,
  D: 50,
  E: 35,
} as const;

export function gradeOf(score: number): Grade {
  if (score >= METHODE_THRESHOLDS.A) return 'A';
  if (score >= METHODE_THRESHOLDS.B) return 'B';
  if (score >= METHODE_THRESHOLDS.C) return 'C';
  if (score >= METHODE_THRESHOLDS.D) return 'D';
  if (score >= METHODE_THRESHOLDS.E) return 'E';
  return 'F';
}

/** Libellé de niveau : D, E et F se lisent tous « Problème ». */
export function levelOf(grade: Grade): Level {
  return grade === 'A' || grade === 'B' || grade === 'C' ? grade : 'P';
}

/** Moyenne à poids égaux des domaines comptés, arrondie ; null si aucun. */
export function overall(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Domaines de la calculette (fictifs) : nom de clé, note, compté au départ. */
export const CALC_DOMAINS = [
  { key: 'perf', score: 72, on: true },
  { key: 'seo', score: 88, on: true },
  { key: 'a11y', score: 64, on: true },
  { key: 'eco', score: 58, on: true },
  { key: 'tech', score: 81, on: true },
  { key: 'sec', score: 93, on: true },
  { key: 'priv', score: 70, on: true },
  { key: 'dns', score: 40, on: false },
] as const;

/** Étape lue → étape du rail (6 étapes, 4 repères). */
export const STORY_RAIL = [0, 1, 1, 2, 3, 3] as const;

export type Piece = { text: string; bold?: boolean };

/**
 * Remplit un modèle « {n} donne {g} » ; les champs nommés dans `bold`
 * deviennent des morceaux en gras (aucun HTML dans les dictionnaires).
 */
export function fill(
  template: string,
  values: Readonly<Record<string, string | number>>,
  bold: readonly string[] = [],
): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const name = match[1] ?? '';
    const at = match.index ?? 0;
    if (at > last) out.push({ text: template.slice(last, at) });
    const value = values[name];
    if (value === undefined) throw new Error(`paramètre manquant : ${name}`);
    out.push(
      bold.includes(name)
        ? { text: String(value), bold: true }
        : { text: String(value) },
    );
    last = at + match[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}
