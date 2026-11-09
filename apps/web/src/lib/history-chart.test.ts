import { describe, expect, it } from 'vitest';
import { evolutionChart, GRADE_B_THRESHOLD } from './history-chart.js';

describe('evolutionChart', () => {
  it('reproduit la courbe de démonstration entre 70 et 90', () => {
    const chart = evolutionChart([
      { label: 'Déc. 2025', value: 78 },
      { label: 'Janv.', value: 79 },
      { label: 'Févr.', value: 80 },
      { label: 'Mars', value: 81 },
      { label: 'Avr.', value: 82 },
      { label: 'Mai 2026', value: 84 },
    ]);
    expect(chart?.min).toBe(70);
    expect(chart?.max).toBe(90);
    expect(chart?.polyline).toBe(
      '70.0,168.0 234.0,156.5 398.0,145.0 562.0,133.5 726.0,122.0 890.0,99.0',
    );
    expect(chart?.area).toBe(
      'M70.0,260.0 L70.0,168.0 L234.0,156.5 L398.0,145.0 L562.0,133.5 L726.0,122.0 L890.0,99.0 L890.0,260.0 Z',
    );
    expect(chart?.marks[0]?.hitX).toBeCloseTo(-12);
    expect(chart?.marks[5]?.hitX).toBeCloseTo(808);
    expect(chart?.average).toBe('80,7');
    expect(chart?.ticks.map((tick) => tick.label)).toEqual(['70', '80', '90']);
  });

  it('écarte l’échelle quand une note sort de 70–90', () => {
    const chart = evolutionChart([
      { label: 'mars', value: 40 },
      { label: 'avril', value: 55 },
    ]);
    expect(chart?.min).toBeLessThan(40);
    expect(chart?.max).toBeGreaterThan(55);
    expect(chart?.polyline.startsWith('70.0,')).toBe(true);
    expect(chart?.polyline).not.toContain('168.0');
    expect(chart?.marks).toHaveLength(2);
    expect(chart?.marks[1]?.x).toBeCloseTo(890);
  });

  it('refuse une série vide', () => {
    expect(evolutionChart([])).toBeNull();
  });
});

describe('seuil rang B (QA Mo M4, M1 bug_22d8d4f1 : B = 80)', () => {
  it('trace la ligne 80 à la hauteur de 80, entre les graduations 75 et 90', () => {
    const chart = evolutionChart([
      { label: '15 oct.', value: 64 },
      { label: '26 oct.', value: 78 },
      { label: '4 nov.', value: 86 },
    ]);
    expect(GRADE_B_THRESHOLD).toBe(80);
    expect(chart?.min).toBe(60);
    expect(chart?.max).toBe(90);
    const mid = Number(chart?.ticks[1]?.y);
    const top = Number(chart?.ticks[2]?.y);
    const y = Number(chart?.threshold.y);
    expect(chart?.threshold.visible).toBe(true);
    expect(y).toBeLessThan(mid);
    expect(y).toBeGreaterThan(top);
    // 64 et 78 sont sous le seuil B (rang C) : leurs points sont plus bas
    // (y plus grand) que la ligne ; 86 (rang B) est au-dessus.
    expect(chart?.marks[0]?.y).toBeGreaterThan(y);
    expect(chart?.marks[1]?.y).toBeGreaterThan(y);
    expect(chart?.marks[2]?.y).toBeLessThan(y);
  });

  it('masque le seuil quand 80 sort de l’échelle', () => {
    const chart = evolutionChart([
      { label: 'mars', value: 20 },
      { label: 'avril', value: 30 },
    ]);
    expect(chart?.threshold.visible).toBe(false);
  });
});
