/** Calculs purs des animations de l’accueil v6 (testés sans navigateur). */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Courbe douce 0 → 1 (cosinus), utilisée par le scan et la vue éclatée. */
export function easeInOut(x: number): number {
  return x >= 1 ? 1 : (1 - Math.cos(clamp(x, 0, 1) * Math.PI)) / 2;
}

/** Position du faisceau dans le cycle de 7 s : aller, pause, retour. */
export function beamAt(cycle: number): number {
  const c = clamp(cycle, 0, 1);
  if (c > 0.93) return 0.98 * (1 - (c - 0.93) / 0.07);
  return c < 0.72 ? easeInOut(c / 0.72) * 0.98 : 0.98;
}

/** Note provisoire affichée pendant le passage du faisceau (67 à la fin). */
export function provisionalScore(x: number): number {
  return Math.round(67 * clamp(x / 0.7, 0, 1));
}

/** Couche active de la vue éclatée selon la progression du défilement. */
export function explodeStep(q: number): {
  sep: number;
  layer: number;
  dim: boolean;
  done: boolean;
} {
  const sep = easeInOut(clamp(q / 0.38, 0, 1));
  const layer = q < 0.4 ? 0 : Math.min(3, Math.floor((q - 0.4) / 0.13));
  return { sep, layer, dim: q >= 0.4 && q < 0.92, done: q >= 0.92 };
}
