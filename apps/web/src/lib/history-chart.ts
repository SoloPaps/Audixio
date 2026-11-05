import { formatFixed } from '../i18n/format.js';

/** Géométrie du graphique d’évolution (viewBox 960×300 des maquettes). */

export interface EvolutionPoint {
  label: string;
  value: number;
}

export interface EvolutionMark {
  index: number;
  x: number;
  y: number;
  value: number;
  label: string;
  delay: string;
  hitX: number;
  hitWidth: number;
}

export interface EvolutionTick {
  y: string;
  textY: string;
  label: string;
}

export interface EvolutionChart {
  min: number;
  max: number;
  polyline: string;
  area: string;
  marks: EvolutionMark[];
  ticks: EvolutionTick[];
  average: string;
}

/** Cadre horizontal du graphique : largeur du viewBox et abscisses extrêmes. */
export interface ChartFrame {
  width: number;
  x0: number;
  x1: number;
}

/** Bureau : viewBox 960×300 des maquettes. */
export const CHART_WIDE: ChartFrame = { width: 960, x0: 70, x1: 890 };
/**
 * Mobile (≤ 480 px) : viewBox 360×300, soit environ 190 px de haut à 330 px
 * de large, au lieu de 60 px pour le 960×300 réduit.
 */
export const CHART_NARROW: ChartFrame = { width: 360, x0: 60, x1: 318 };
/** Écart minimal entre deux libellés d’abscisse sur mobile (unités viewBox). */
export const NARROW_LABEL_GAP = 96;

const Y_TOP = 30;
const Y_BOTTOM = 260;
const SPAN = Y_BOTTOM - Y_TOP;

function one(value: number): string {
  return value.toFixed(1);
}

function range(values: readonly number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo >= 70 && hi <= 90) return { min: 70, max: 90 };
  const pad = Math.max(4, Math.round((hi - lo) * 0.2));
  let min = Math.max(0, Math.floor(lo - pad));
  let max = Math.min(100, Math.ceil(hi + pad));
  if (max - min < 10) {
    min = Math.max(0, min - 5);
    max = Math.min(100, max + 5);
  }
  if (max <= min) return { min: 0, max: 100 };
  return { min, max };
}

/** Courbe, aires et pastilles. `null` s’il n’y a aucun point. */
export function evolutionChart(
  points: readonly EvolutionPoint[],
  frame: ChartFrame = CHART_WIDE,
): EvolutionChart | null {
  const { x0, x1 } = frame;
  const rows = points.filter((point) => Number.isFinite(point.value));
  if (rows.length === 0) return null;
  const { min, max } = range(rows.map((point) => point.value));
  const step = rows.length === 1 ? 0 : (x1 - x0) / (rows.length - 1);
  const hitWidth = rows.length === 1 ? x1 - x0 : step;
  const yOf = (value: number): number =>
    Y_BOTTOM - ((value - min) / (max - min)) * SPAN;
  const marks: EvolutionMark[] = rows.map((point, index) => {
    const x = rows.length === 1 ? (x0 + x1) / 2 : x0 + index * step;
    return {
      index,
      x,
      y: yOf(point.value),
      value: point.value,
      label: point.label,
      delay: `${(0.25 + index * 0.18).toFixed(2)}s`,
      hitX: x - hitWidth / 2,
      hitWidth,
    };
  });
  const pairs = marks.map((mark) => `${one(mark.x)},${one(mark.y)}`);
  const first = marks[0];
  const last = marks[marks.length - 1];
  if (!first || !last) return null;
  const mid = (min + max) / 2;
  const ticks = [min, mid, max].map((value) => {
    const y = yOf(value);
    return { y: one(y), textY: one(y + 4), label: String(Math.round(value)) };
  });
  const sum = rows.reduce((total, point) => total + point.value, 0);
  return {
    min,
    max,
    polyline: pairs.join(' '),
    area: `M${one(first.x)},${one(Y_BOTTOM)} L${pairs.join(' L')} L${one(last.x)},${one(Y_BOTTOM)} Z`,
    marks,
    ticks,
    average: formatFixed(sum / rows.length, 1),
  };
}

/**
 * Libellés d’abscisse (et valeurs) à afficher : tous sur bureau ; sur mobile,
 * le premier, le dernier et ceux qui gardent `gap` unités d’écart, pour que
 * les dates ne se chevauchent pas.
 */
export function shownLabels(
  xs: readonly number[],
  gap: number | null,
): boolean[] {
  if (gap === null) return xs.map(() => true);
  const last = xs.length - 1;
  const shown = xs.map(() => false);
  if (last < 0) return shown;
  shown[0] = true;
  shown[last] = true;
  let previous = xs[0] ?? 0;
  const end = xs[last] ?? 0;
  for (let index = 1; index < last; index += 1) {
    const x = xs[index] ?? 0;
    if (x - previous >= gap && end - x >= gap) {
      shown[index] = true;
      previous = x;
    }
  }
  if (last > 0 && end - (xs[0] ?? 0) < gap) shown[last] = false;
  return shown;
}
