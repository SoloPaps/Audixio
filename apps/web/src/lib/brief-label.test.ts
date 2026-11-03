import type { FindingView } from '@audigy/orchestrator';
import { describe, expect, it } from 'vitest';
import { labelBriefFinding } from './brief-deps.js';

function finding(domain: string, checkId: string): FindingView {
  return {
    domain,
    checkId,
    status: 'fail',
    severity: 3,
    impact: 2,
    score: 0,
    measured: { note: 'JETON-MESURE-SECRET' },
    messageKey: 'performance.lcp.fail',
    params: { detail: 'JETON-MESURE-SECRET' },
    fixKey: checkId,
    effortMinutes: null,
    reason: null,
  };
}

describe('libellé serveur du brief', () => {
  it('ne révèle pas un domaine verrouillé', () => {
    const line = labelBriefFinding(finding('securite', 'securite.hsts'));
    expect(line.title).toBe('Constat relevé sur ce site.');
    expect(line.proof).not.toContain('JETON');
    expect(line.proof).not.toContain('securite');
  });

  it('traduit un domaine ouvert sans la mesure brute', () => {
    const line = labelBriefFinding(finding('performance', 'performance.lcp'));
    expect(line.title.length).toBeGreaterThan(0);
    expect(line.title).not.toContain('JETON-MESURE-SECRET');
    expect(line.proof).not.toContain('JETON-MESURE-SECRET');
  });
});
