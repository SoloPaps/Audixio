import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr.js';
import {
  createSim,
  etaLabel,
  PER_TICK,
  STAGES,
  tickSim,
} from './progress-sim.js';

describe('barre de progression', () => {
  it('avance en continu, pas par paliers de 25 %', () => {
    let sim = createSim();
    const seen: number[] = [];
    for (let index = 0; index < 8; index += 1) {
      sim = tickSim(sim);
      seen.push(sim.percent);
    }
    const first = seen[0] ?? 0;
    const second = seen[1] ?? 0;
    expect(first).toBe(70 + PER_TICK);
    expect(second - first).toBe(PER_TICK);
    expect(Math.max(...seen) - Math.min(...seen)).toBeLessThan(25);
  });

  it('met à jour le domaine du bas quand le palier est franchi', () => {
    let sim = createSim();
    let guard = 0;
    while (!sim.domains.some((item) => item.key === 'perf') && guard < 80) {
      sim = tickSim(sim);
      guard += 1;
    }
    expect(sim.domains).toContainEqual({ key: 'perf', state: 'done' });
    expect(sim.domains).toContainEqual({ key: 'a11y', state: 'active' });
    expect(sim.percent).toBeGreaterThan(70);
    expect(sim.percent).toBeLessThan(100);
  });

  it('n’affiche plus de délai à 100 %', () => {
    expect(etaLabel(100)).toBe('');
    expect(etaLabel(100)).not.toContain('2 à 4');
    expect(etaLabel(70).startsWith('~')).toBe(true);
  });

  it('donne des clés traduisibles, pas du français en dur (QA Mo M16)', () => {
    const keys = STAGES.flatMap((stage) => [...stage.phrases]);
    for (const key of keys) expect(Object.keys(fr)).toContain(key);
    expect(etaLabel(99)).toBe('~1 seconde');
    expect(etaLabel(98)).toBe('~2 secondes');
  });
});
