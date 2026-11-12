import { describe, expect, it } from 'vitest';
import {
  beamAt,
  clamp,
  easeInOut,
  explodeStep,
  pad,
  provisionalScore,
} from './accueil-v6-math.js';

describe('animations de l’accueil v6', () => {
  it('borne et formate', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(pad(3)).toBe('03');
    expect(pad(12)).toBe('12');
  });

  it('courbe douce de 0 à 1', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBe(1);
  });

  it('le faisceau va, s’arrête, puis revient au départ', () => {
    expect(beamAt(0)).toBe(0);
    expect(beamAt(0.72)).toBeCloseTo(0.98);
    expect(beamAt(0.9)).toBeCloseTo(0.98);
    expect(beamAt(1)).toBeCloseTo(0);
    expect(beamAt(0.3)).toBeGreaterThan(beamAt(0.1));
  });

  it('la note provisoire monte jusqu’à 67', () => {
    expect(provisionalScore(0)).toBe(0);
    expect(provisionalScore(0.35)).toBe(34);
    expect(provisionalScore(0.7)).toBe(67);
    expect(provisionalScore(1)).toBe(67);
  });

  it('la vue éclatée sépare, puis montre chaque couche, puis le résultat', () => {
    expect(explodeStep(0)).toEqual({
      sep: 0,
      layer: 0,
      dim: false,
      done: false,
    });
    expect(explodeStep(0.38).sep).toBe(1);
    expect(explodeStep(0.45)).toMatchObject({ layer: 0, dim: true });
    expect(explodeStep(0.6).layer).toBe(1);
    expect(explodeStep(0.75).layer).toBe(2);
    expect(explodeStep(0.85).layer).toBe(3);
    expect(explodeStep(0.95)).toMatchObject({
      layer: 3,
      dim: false,
      done: true,
    });
  });
});
