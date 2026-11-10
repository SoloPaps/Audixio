import { describe, expect, it } from 'vitest';
import { applyCadenceSummary, cadenceSummaryKey } from './alerts-cadence.js';

describe('M1 — résumé de la cadence d’alertes', () => {
  it('affiche aussi la cadence mensuelle et ignore une valeur inconnue', () => {
    expect(cadenceSummaryKey('monthly')).toBe('mq.ui.cadence.monthly');
    expect(cadenceSummaryKey('daily')).toBe('mq.ui.cadence.daily');
    expect(cadenceSummaryKey('weekly')).toBe('mq.ui.cadence.weekly');
    expect(cadenceSummaryKey('never')).toBeNull();
    const node = { textContent: 'Hebdomadaire' };
    applyCadenceSummary(node, 'monthly');
    expect(node.textContent).toMatch(/Mensuelle|Monthly/);
  });
});
