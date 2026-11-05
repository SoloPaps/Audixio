import { describe, expect, it } from 'vitest';
import {
  CHART_NARROW,
  CHART_WIDE,
  evolutionChart,
  NARROW_LABEL_GAP,
  shownLabels,
} from './history-chart.js';

const points = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    label: `j${index}`,
    value: 60 + index * 3,
  }));

describe('graphique d’historique sur mobile (retest C11)', () => {
  it('le cadre mobile est assez haut pour environ 180 px à 330 px', () => {
    // Carte de 224 px de large à 330 px : hauteur = 224 × 300 / largeur.
    expect((224 * 300) / CHART_NARROW.width).toBeGreaterThanOrEqual(180);
    expect((224 * 300) / CHART_WIDE.width).toBeLessThan(80);
  });

  it('place toutes les pastilles dans le cadre mobile', () => {
    const chart = evolutionChart(points(6), CHART_NARROW);
    const xs = chart?.marks.map((mark) => mark.x) ?? [];
    expect(xs[0]).toBe(CHART_NARROW.x0);
    expect(xs.at(-1)).toBe(CHART_NARROW.x1);
    expect(Math.max(...xs)).toBeLessThan(CHART_NARROW.width);
  });

  it('le bureau garde la géométrie 960×300 des maquettes', () => {
    const chart = evolutionChart(points(2));
    expect(chart?.marks.map((mark) => mark.x)).toEqual([70, 890]);
  });

  it('n’affiche que des libellés espacés, le premier et le dernier compris', () => {
    for (const count of [2, 3, 6, 12, 26]) {
      const xs =
        evolutionChart(points(count), CHART_NARROW)?.marks.map(
          (mark) => mark.x,
        ) ?? [];
      const shown = shownLabels(xs, NARROW_LABEL_GAP);
      expect(shown[0]).toBe(true);
      expect(shown.at(-1)).toBe(true);
      const kept = xs.filter((_, index) => shown[index]);
      for (let index = 1; index < kept.length; index += 1) {
        expect(
          (kept[index] ?? 0) - (kept[index - 1] ?? 0),
        ).toBeGreaterThanOrEqual(NARROW_LABEL_GAP);
      }
    }
  });

  it('affiche tous les libellés sur bureau', () => {
    expect(shownLabels([70, 234, 398], null)).toEqual([true, true, true]);
  });
});
