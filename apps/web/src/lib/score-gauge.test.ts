import { GRADE_THRESHOLDS } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n/index.js';
import {
  GAUGE,
  gaugeBands,
  gaugeFillDash,
  gaugeLabel,
  gaugePoint,
  gaugeRing,
} from './score.js';

describe('cadran du score (refonte)', () => {
  it('l’anneau est complet et part du haut', () => {
    const d = gaugeRing(GAUGE.cx, GAUGE.cy, GAUGE.r);
    expect(d.startsWith(`M ${GAUGE.cx} ${GAUGE.cy - GAUGE.r} `)).toBe(true);
    expect(d.endsWith(`${GAUGE.cx} ${GAUGE.cy - GAUGE.r}`)).toBe(true);
    expect(GAUGE.viewBox).toBe(`0 0 ${GAUGE.width} ${GAUGE.height}`);
    // Quatre quarts, pas deux demi-cercles à 180° (large-arc 1 ambigu).
    expect(d.split(`A ${GAUGE.r} ${GAUGE.r} 0 0 1`)).toHaveLength(5);
    expect(d.includes(' 0 1 1 ')).toBe(false);
  });

  it('le trait du score occupe exactement la part du tour', () => {
    expect(gaugeFillDash(null)).toBe('0 100');
    expect(gaugeFillDash(0)).toBe('0 100');
    expect(gaugeFillDash(66)).toBe('66 34');
    expect(gaugeFillDash(72)).toBe('72 28');
    expect(gaugeFillDash(100)).toBe('100 0');
    expect(gaugeFillDash(140)).toBe('100 0');
    expect(gaugeFillDash(-5)).toBe('0 100');
  });

  it('le point suit le score : haut, droite, bas, gauche', () => {
    const { cx, cy, r } = GAUGE;
    expect(gaugePoint(cx, cy, r, 0)).toEqual({ x: cx, y: cy - r });
    expect(gaugePoint(cx, cy, r, 25)).toEqual({ x: cx + r, y: cy });
    expect(gaugePoint(cx, cy, r, 50)).toEqual({ x: cx, y: cy + r });
    expect(gaugePoint(cx, cy, r, 75)).toEqual({ x: cx - r, y: cy });
    expect(gaugePoint(cx, cy, r, 140)).toEqual(gaugePoint(cx, cy, r, 100));
  });

  it('les bandes couvrent 0–100 selon le barème officiel, sans trou', () => {
    const bands = gaugeBands(GRADE_THRESHOLDS);
    expect(bands.map((b) => b.grade)).toEqual(['F', 'E', 'D', 'C', 'B', 'A']);
    expect(bands[0]?.from).toBe(0);
    expect(bands.at(-1)?.to).toBe(100);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]?.from).toBe(bands[i - 1]?.to);
    }
    expect(bands.find((b) => b.grade === 'C')).toEqual({
      grade: 'C',
      from: GRADE_THRESHOLDS.C,
      to: GRADE_THRESHOLDS.B,
    });
  });

  it('le libellé lu donne le nombre ET la lettre', () => {
    const label = gaugeLabel(t('domain.global'), 66);
    expect(label).toContain('66');
    expect(label).toContain('note C');
    expect(gaugeLabel(t('domain.global'), null)).not.toContain('note');
  });
});
