import { GRADE_THRESHOLDS } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n/index.js';
import {
  GAUGE,
  gaugeBands,
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
