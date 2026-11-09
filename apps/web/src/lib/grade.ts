import { type Grade, gradeForScore as gradeFromDb } from '@audigy/db';
import { t } from '../i18n/index.js';
import { levelForScore, levelLabel } from './score.js';

export type { Grade } from '@audigy/db';

/** Barème unique de `@audigy/db` (`GRADE_THRESHOLDS`). */
export const gradeForScore: (score: number | null) => Grade | null =
  gradeFromDb;

export interface GradeCopy {
  grade: Grade;
  letter: string;
  label: string;
}

/** Note en lettre, libellé et /100. `null` quand le site n’a pas de note. */
export function gradeCopy(score: number | null): GradeCopy | null {
  const grade = gradeForScore(score);
  if (grade === null || score === null) return null;
  return {
    grade,
    letter: t('report.grade.letter', { grade }),
    label: t('report.grade.label', {
      label: levelLabel(levelForScore(score)),
      score: Math.round(score),
    }),
  };
}
