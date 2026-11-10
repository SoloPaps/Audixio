import { gradeForScore } from '@audigy/db';
import { type MessageKey, t } from '../i18n/index.js';

export const LEVELS = ['good', 'improve', 'problem', 'untested'] as const;
export type Level = (typeof LEVELS)[number];

/** Cadran du score : anneau complet, bandes du barème autour. */
export const GAUGE = {
  cx: 100,
  cy: 100,
  r: 78,
  band: 94,
  width: 200,
  height: 200,
  viewBox: '0 0 200 200',
} as const;

const SENTENCE: Record<Level, MessageKey> = {
  good: 'level.good.sentence',
  improve: 'level.improve.sentence',
  problem: 'level.problem.sentence',
  untested: 'level.untested.sentence',
};

const LABEL: Record<Level, MessageKey> = {
  good: 'level.good',
  improve: 'level.improve',
  problem: 'level.problem',
  untested: 'level.untested',
};

export function levelForScore(score: number | null): Level {
  if (score === null) return 'untested';
  if (score >= 80) return 'good';
  if (score >= 50) return 'improve';
  return 'problem';
}

export function levelLabel(level: Level): string {
  return t(LABEL[level]);
}

export function gaugeLabel(domain: string, score: number | null): string {
  const level = levelForScore(score);
  if (score === null) {
    return t('gauge.untested', { domain, level: t(SENTENCE[level]) });
  }
  return t('gauge.score', {
    domain,
    score,
    grade: gradeForScore(score) ?? '',
    level: t(SENTENCE[level]),
  });
}

function point(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Anneau complet, départ en haut, sens horaire (pathLength 100 = score).
 * Quatre quarts d’arc (large-arc 0) : deux demi-cercles à 180° avec
 * large-arc 1 sont ambigus et peuvent allonger le tracé. */
export function gaugeRing(cx: number, cy: number, r: number): string {
  const top = `${cx} ${round(cy - r)}`;
  const right = `${round(cx + r)} ${cy}`;
  const bottom = `${cx} ${round(cy + r)}`;
  const left = `${round(cx - r)} ${cy}`;
  const q = `A ${r} ${r} 0 0 1`;
  return `M ${top} ${q} ${right} ${q} ${bottom} ${q} ${left} ${q} ${top}`;
}

/** Position du score sur l’anneau (0 en haut, 100 au tour complet). */
export function gaugePoint(
  cx: number,
  cy: number,
  r: number,
  score: number,
): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(100, score));
  const p = point(cx, cy, r, -90 + (clamped / 100) * 360);
  return { x: round(p.x), y: round(p.y) };
}

/** Trait du score : N unités de remplissage, 100−N de vide (pathLength 100). */
export function gaugeFillDash(score: number | null): string {
  if (score === null) return '0 100';
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.round(clamped * 100) / 100;
  return `${filled} ${100 - filled}`;
}

/**
 * Bandes du barème officiel (F < E < D < C < B < A), en part de l’anneau.
 * Les seuils viennent de GRADE_THRESHOLDS : une seule source.
 */
export function gaugeBands(thresholds: {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}): { grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; from: number; to: number }[] {
  return [
    { grade: 'F', from: 0, to: thresholds.E },
    { grade: 'E', from: thresholds.E, to: thresholds.D },
    { grade: 'D', from: thresholds.D, to: thresholds.C },
    { grade: 'C', from: thresholds.C, to: thresholds.B },
    { grade: 'B', from: thresholds.B, to: thresholds.A },
    { grade: 'A', from: thresholds.A, to: 100 },
  ];
}
