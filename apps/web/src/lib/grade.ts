import { type Grade, gradeForScore as gradeFromDb } from '@audigy/db';
import { type MessageKey, t } from '../i18n/index.js';

export type { Grade } from '@audigy/db';

/** Barème unique de `@audigy/db` (`GRADE_THRESHOLDS`). */
export const gradeForScore: (score: number | null) => Grade | null =
  gradeFromDb;

export interface GradeCopy {
  grade: Grade;
  letter: string;
  label: string;
}

/**
 * Libellé de chaque lettre, le même que le barème publié sur /methode :
 * A Excellent, B Bon, C À améliorer, D à F Problème.
 */
const GRADE_LABEL: Record<Grade, MessageKey> = {
  A: 'level.excellent',
  B: 'level.good',
  C: 'level.improve',
  D: 'level.problem',
  E: 'level.problem',
  F: 'level.problem',
};

export function gradeLabel(grade: Grade): string {
  return t(GRADE_LABEL[grade]);
}

/** Note en lettre, libellé et /100. `null` quand le site n’a pas de note. */
export function gradeCopy(score: number | null): GradeCopy | null {
  const grade = gradeForScore(score);
  if (grade === null || score === null) return null;
  return {
    grade,
    letter: t('report.grade.letter', { grade }),
    label: t('report.grade.label', {
      label: gradeLabel(grade),
      score: Math.round(score),
    }),
  };
}
