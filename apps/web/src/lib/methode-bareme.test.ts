import { readFileSync } from 'node:fs';
import { GRADE_THRESHOLDS } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import { mqFr } from '../i18n/mq-fr.js';

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const frJson = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-fr.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

/** Fourchettes publiées sur /methode, alignées sur le barème unique. */
const RANGES = {
  'mq.m.031': [GRADE_THRESHOLDS.A, 100],
  'mq.m.036': [GRADE_THRESHOLDS.B, GRADE_THRESHOLDS.A - 1],
  'mq.m.040': [GRADE_THRESHOLDS.C, GRADE_THRESHOLDS.B - 1],
  'mq.m.045': [GRADE_THRESHOLDS.D, GRADE_THRESHOLDS.C - 1],
} as const;

describe('M3 — barème de /methode identique à GRADE_THRESHOLDS', () => {
  it('publie A 90–100, B 80–89, C 65–79, D 50–64 en FR et en EN', () => {
    expect(GRADE_THRESHOLDS).toEqual({ A: 90, B: 80, C: 65, D: 50, E: 35 });
    for (const [key, [lo, hi]] of Object.entries(RANGES)) {
      expect(mqFr[key as keyof typeof mqFr], key).toBe(`${lo} à ${hi}`);
      expect(frJson[key], key).toBe(`${lo} à ${hi}`);
      expect(en[key], key).toBe(`${lo} to ${hi}`);
    }
  });
});

describe('barème de /methode : A est « Excellent »', () => {
  it('la carte A ne dit plus « Bon », en FR et en EN', () => {
    expect(mqFr['mq.m.030']).toBe('Excellent');
    expect(frJson['mq.m.030']).toBe('Excellent');
    expect(en['mq.m.030']).toBe('Excellent');
    expect(mqFr['mq.m.036b']).toBe('Bon');
    expect(en['mq.m.036b']).toBe('Good');
    expect(frJson['level.excellent']).toBe('Excellent');
    expect(en['level.excellent']).toBe('Excellent');
  });
});
