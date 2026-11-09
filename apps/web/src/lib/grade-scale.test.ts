import { readFileSync } from 'node:fs';
import { gradeForScore as dbGrade, GRADE_THRESHOLDS } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import { mailGrade } from '../../../../packages/orchestrator/src/mail-templates.js';
import { pdfFr } from '../i18n/pdf-fr.js';
import { gradeForScore } from './grade.js';
import { GRADE_B_THRESHOLD } from './history-chart.js';

// QA Mo 05/11 M1 (bug_22d8d4f1) : un seul barème score → lettre partout.

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

describe('M1 — barème unique des notes', () => {
  it('B commence à 80 ; 78 est C pour l’app, les courriels et la base', () => {
    expect(GRADE_THRESHOLDS.B).toBe(80);
    expect(GRADE_B_THRESHOLD).toBe(GRADE_THRESHOLDS.B);
    for (const read of [gradeForScore, mailGrade, dbGrade]) {
      expect(read(78)).toBe('C');
      expect(read(79.9)).toBe('C');
      expect(read(80)).toBe('B');
    }
  });

  it('l’app, les courriels et la base donnent la même lettre de 0 à 100', () => {
    for (let score = 0; score <= 100; score += 0.5) {
      const grade = dbGrade(score);
      expect(gradeForScore(score), String(score)).toBe(grade);
      expect(mailGrade(score), String(score)).toBe(grade);
    }
  });

  it('les bornes du barème du PDF (FR et EN) suivent les seuils', () => {
    const cuts: Record<string, [number, number]> = {
      A: [GRADE_THRESHOLDS.A, 100],
      B: [GRADE_THRESHOLDS.B, GRADE_THRESHOLDS.A - 1],
      C: [GRADE_THRESHOLDS.C, GRADE_THRESHOLDS.B - 1],
      D: [GRADE_THRESHOLDS.D, GRADE_THRESHOLDS.C - 1],
      E: [GRADE_THRESHOLDS.E, GRADE_THRESHOLDS.D - 1],
      F: [0, GRADE_THRESHOLDS.E - 1],
    };
    for (const [grade, [lo, hi]] of Object.entries(cuts)) {
      const key = `pdf.hint.${grade}` as keyof typeof pdfFr;
      expect(pdfFr[key], key).toContain(`${grade} = ${lo} à ${hi}`);
      expect(en[key], key).toContain(`${grade} is ${lo} to ${hi}`);
    }
  });
});
