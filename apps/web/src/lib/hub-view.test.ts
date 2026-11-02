import { describe, expect, it } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import {
  actionCounts,
  domainLetter,
  domainNavLabel,
  failureKind,
  hostLabel,
  mergeApercu,
  priorityHref,
  shareGesture,
} from './hub-view.js';

function payload(): AuditPayload {
  return {
    audit: {
      id: 'audit-1',
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 72,
      coverage: 1,
      createdAt: '2026-10-23T12:00:00.000Z',
      startedAt: null,
      finishedAt: '2026-10-23T12:30:00.000Z',
      error: null,
      site: {
        id: 'site-1',
        url: 'https://exemple.fr/accueil',
        label: 'Exemple',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 80, coverage: 1, level: 'good' },
      { domain: 'securite', score: 40, coverage: 1, level: 'problem' },
    ],
    findings: [
      {
        domain: 'performance',
        checkId: 'performance.poids',
        status: 'fail',
        severity: 4,
        impact: 3,
        score: 0,
        measured: {},
        messageKey: 'finding.untested',
        params: {},
        fixKey: null,
        effortMinutes: 10,
        reason: null,
      },
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        impact: 3,
        score: 0,
        measured: {},
        messageKey: 'finding.untested',
        params: {},
        fixKey: null,
        effortMinutes: 10,
        reason: null,
      },
    ],
  };
}

describe('hub', () => {
  it('nomme l’hôte et l’ancre du constat', () => {
    expect(hostLabel('https://exemple.fr/a')).toBe('exemple.fr');
    expect(priorityHref('a b', 'seo', 'seo.title-0')).toBe(
      '/domaine?id=a%20b&domaine=seo#finding-seo.title-0',
    );
  });

  it('n’écrit pas de score sur 100 dans la nav des domaines', () => {
    const open = domainNavLabel('Vitesse', 80, false);
    const locked = domainNavLabel('Protection', 40, true);
    expect(open).toBe('Vitesse, Note B');
    expect(open).not.toMatch(/100/);
    expect(locked).toBe('Protection, Verrouillé');
    expect(domainLetter(80, false)).toBe('B');
    expect(domainLetter(40, true)).toBeNull();
  });

  it('ouvre la feuille native seulement au toucher', () => {
    expect(shareGesture(true, true)).toBe('native');
    expect(shareGesture(false, true)).toBe('dialog');
    expect(shareGesture(true, false)).toBe('dialog');
  });

  it('retire la note et les constats sensibles sans preuve', () => {
    const next = mergeApercu(payload(), {
      site_verifie: false,
      score_global: null,
      note_partielle: 'partielle · 1 domaines · site non vérifié',
      domaines: [
        { domaine: 'performance', verrouille: false, score: 80 },
        { domaine: 'securite', verrouille: true, score: null },
      ],
      constats: [{ check_id: 'performance.poids' }],
    });
    expect(next.audit.globalScore).toBeNull();
    expect(next.audit.siteVerified).toBe(false);
    expect(next.findings.map((item) => item.checkId)).toEqual([
      'performance.poids',
    ]);
    expect(
      next.domains.find((item) => item.domain === 'securite')?.locked,
    ).toBe(true);
  });

  it('garde le constat ouvert quand la preuve existe', () => {
    const next = mergeApercu(payload(), {
      site_verifie: true,
      score_global: 72,
      domaines: [{ domaine: 'securite', verrouille: false, score: 40 }],
      constats: [
        { check_id: 'securite.hsts' },
        { check_id: 'performance.poids' },
      ],
    });
    expect(next.audit.globalScore).toBe(72);
    expect(next.findings).toHaveLength(2);
  });

  it('ignore un aperçu vide', () => {
    const source = payload();
    expect(mergeApercu(source, {})).toBe(source);
  });

  it('classe l’échec et compte les statuts', () => {
    expect(failureKind('http 403')).toBe('denied');
    expect(failureKind('timeout')).toBe('down');
    expect(failureKind(null)).toBe('failed');
    expect(actionCounts(['todo', 'doing', 'done', 'done'])).toEqual({
      todo: 1,
      doing: 1,
      done: 2,
    });
  });
});
