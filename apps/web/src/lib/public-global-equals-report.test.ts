import { gradeForScore } from '@audigy/db';
import { type Domain, MAIN_DOMAINS, scoreGlobal } from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { presentRow } from './public-score.js';

function domainRow(
  domain: Domain,
  score: number | null,
): {
  domain: Domain;
  score: number | null;
  coverage: number;
  testedWeight: number;
  totalWeight: number;
  level: 'good' | 'improve' | 'problem' | 'untested';
} {
  return {
    domain,
    score,
    coverage: score === null ? 0 : 1,
    testedWeight: score === null ? 0 : 1,
    totalWeight: 1,
    level: score === null ? 'untested' : score >= 80 ? 'good' : 'problem',
  };
}

describe('égalité note globale /score et rapport complet', () => {
  it('la moyenne des seuls domaines ouverts n’égale pas scoreGlobal', () => {
    const domains = MAIN_DOMAINS.map((domain) =>
      domainRow(
        domain,
        ['securite', 'vie_privee', 'dns_email'].includes(domain) ? 40 : 80,
      ),
    );
    const report = scoreGlobal(domains).score;
    const openOnly = domains.filter(
      (row) => !['securite', 'vie_privee', 'dns_email'].includes(row.domain),
    );
    const publicAverage = scoreGlobal(openOnly).score;
    expect(report).toBe(65);
    expect(publicAverage).toBe(80);
    expect(publicAverage).not.toBe(report);
  });

  it('presentRow reprend audits.global_score, identique à scoreGlobal, pas la moyenne ouverte', () => {
    const domains = MAIN_DOMAINS.map((domain) =>
      domainRow(
        domain,
        ['securite', 'vie_privee', 'dns_email'].includes(domain) ? 40 : 80,
      ),
    );
    const reportScore = scoreGlobal(domains).score;
    expect(reportScore).toBe(65);
    expect(gradeForScore(reportScore)).toBe('C');
    const view = presentRow({
      site_label: 'Exemple',
      site_url: 'https://exemple.fr',
      finished_at: null,
      method_version: '2026.1',
      global_score: reportScore,
      audit_id: '00000000-0000-4000-8000-000000000019',
      expose_security: false,
      coverage: 1,
      report_id: null,
      domains: domains.map((row) => ({
        domain: row.domain,
        score: row.score,
        level: row.level,
      })),
      security_details: [],
    });
    expect(view.globalScore).toBe(reportScore);
    expect(view.globalScore).toBe(65);
    expect(view.domains.every((row) => row.score === 80)).toBe(true);
    expect(view.domains).toHaveLength(5);
    expect(view.domains.map((row) => row.domain)).not.toContain('securite');
  });
});
