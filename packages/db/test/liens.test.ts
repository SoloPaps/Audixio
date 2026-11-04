import { describe, expect, it } from 'vitest';
import {
  decisionEquipe,
  expiresAt,
  gateLink,
  type LienRapport,
  type LinkRecord,
  lienActif,
  PUBLIC_LINK_DAYS,
  shareTokenFromBytes,
  vueLien,
} from '../src/liens.js';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const SECRET = 'mesure-secrete-hsts';
const BRIEF_COMPLET = 'Audixio Brief — COMPLET secret-brief';
const BRIEF_PARTIEL = 'Audixio Brief — PARTIEL secret-partiel';

function bytes(fill: number): Uint8Array {
  return new Uint8Array(16).fill(fill);
}

function link(over: Partial<LinkRecord> = {}): LinkRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    auditId: '22222222-2222-4222-8222-222222222222',
    ownerId: '33333333-3333-4333-8333-333333333333',
    kind: 'public',
    tokenHash: 'ab'.repeat(32),
    createdAt: '2026-11-01T12:00:00.000Z',
    expiresAt: '2026-12-01T12:00:00.000Z',
    revokedAt: null,
    ownerVerified: true,
    avecBrief: false,
    ...over,
  };
}

function rapport(): LienRapport {
  return {
    label: 'Exemple',
    url: 'https://exemple.fr',
    finishedAt: '2026-11-01T08:00:00.000Z',
    methodVersion: '2026.1',
    globalScore: 72,
    globalGrade: 'C',
    auditId: '22222222-2222-4222-8222-222222222222',
    domains: [
      {
        domain: 'seo',
        score: 80,
        grade: 'B',
        level: 'good',
      },
      {
        domain: 'securite',
        score: 40,
        grade: 'E',
        level: 'problem',
      },
    ],
    findings: [
      {
        domain: 'seo',
        checkId: 'seo.titre',
        status: 'fail',
        severity: 2,
        messageKey: 'finding.seo.titre',
        measured: 'titre court',
        fixKey: 'fix.seo.titre',
      },
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        messageKey: 'finding.securite.hsts',
        measured: SECRET,
        fixKey: 'fix.securite.hsts',
      },
    ],
    briefPartiel: BRIEF_PARTIEL,
    briefComplet: BRIEF_COMPLET,
  };
}

describe('jeton de partage', () => {
  it('sort 32 caractères hexadécimaux imprévisibles', () => {
    const a = shareTokenFromBytes(bytes(1));
    const b = shareTokenFromBytes(bytes(2));
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain('22222222');
  });

  it('refuse une graine trop courte', () => {
    expect(() => shareTokenFromBytes(new Uint8Array(8))).toThrow('token_bytes');
  });
});

describe('durée et porte', () => {
  it('fixe le lien public à 30 jours', () => {
    expect(PUBLIC_LINK_DAYS).toBe(30);
    expect(expiresAt('public', NOW, 7)).toBe('2026-12-03T12:00:00.000Z');
  });

  it('laisse le lien équipe sans date si la durée est nulle', () => {
    expect(expiresAt('team', NOW, 0)).toBeNull();
    expect(expiresAt('team', NOW, 7)).toBe('2026-11-10T12:00:00.000Z');
  });

  it('ferme un lien public révoqué ou expiré', () => {
    expect(gateLink(null, NOW)).toEqual({ state: 'closed' });
    expect(gateLink(link({ revokedAt: NOW.toISOString() }), NOW).state).toBe(
      'closed',
    );
    expect(
      gateLink(link({ expiresAt: '2026-11-03T12:00:00.000Z' }), NOW).state,
    ).toBe('closed');
  });

  it('un lien public expiré ne sert aucune vue', () => {
    const gate = gateLink(link({ expiresAt: '2026-11-03T12:00:00.000Z' }), NOW);
    expect(gate).toEqual({ state: 'closed' });
    expect(vueLien(gate, rapport())).toBeNull();
  });

  it('ramène un lien équipe retiré au soft-gate', () => {
    expect(
      gateLink(
        link({ kind: 'team', revokedAt: NOW.toISOString(), avecBrief: true }),
        NOW,
      ).state,
    ).toBe('retired');
    expect(
      gateLink(
        link({ kind: 'team', expiresAt: '2026-11-03T11:00:00.000Z' }),
        NOW,
      ).state,
    ).toBe('retired');
  });

  it('ne compte plus un lien retiré ou expiré', () => {
    expect(lienActif(link(), NOW)).toBe(true);
    expect(lienActif(link({ revokedAt: NOW.toISOString() }), NOW)).toBe(false);
    expect(
      lienActif(link({ expiresAt: '2026-11-03T12:00:00.000Z' }), NOW),
    ).toBe(false);
  });
});

describe('vue servie', () => {
  it('le lien public ne contient aucune donnée restreinte', () => {
    const vue = vueLien({ state: 'public' }, rapport());
    expect(vue).not.toBeNull();
    const raw = JSON.stringify(vue);
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain('securite.hsts');
    expect(raw).not.toContain(BRIEF_COMPLET);
    expect(raw).not.toContain(BRIEF_PARTIEL);
    expect(raw).not.toContain('fix.seo');
    expect(vue?.noteGlobale).toBe(72);
    expect(vue?.brief).toBe('aucun');
    expect(vue?.constats.map((row) => row.checkId)).toEqual(['seo.titre']);
    expect(vue?.constats[0]?.fixKey).toBeNull();
    expect(
      vue?.domaines.find((row) => row.domain === 'securite'),
    ).toMatchObject({ verrouille: true, score: null, grade: null });
  });

  it('le lien équipe vérifié sert le rapport et le brief en lecture', () => {
    const vue = vueLien(
      { state: 'team', ownerVerified: true, avecBrief: true },
      rapport(),
    );
    expect(vue?.noteGlobale).toBe(72);
    expect(vue?.brief).toBe('complet');
    expect(vue?.briefTexte).toBe(BRIEF_COMPLET);
    expect(vue?.constats.map((row) => row.checkId).sort()).toEqual([
      'securite.hsts',
      'seo.titre',
    ]);
    expect(
      vue?.constats.find((row) => row.checkId === 'securite.hsts')?.fixKey,
    ).toBe('fix.securite.hsts');
  });

  it('le lien équipe sans preuve reste partiel, sans brief si le rôle l’exclut', () => {
    const vue = vueLien(
      { state: 'team', ownerVerified: false, avecBrief: false },
      rapport(),
    );
    const raw = JSON.stringify(vue);
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain(BRIEF_COMPLET);
    expect(vue?.brief).toBe('aucun');
    expect(vue?.noteGlobale).toBeNull();
  });

  it('le lien équipe non vérifié avec brief ne sert que le partiel', () => {
    const vue = vueLien(
      { state: 'team', ownerVerified: false, avecBrief: true },
      rapport(),
    );
    expect(vue?.brief).toBe('partiel');
    expect(vue?.briefTexte).toBe(BRIEF_PARTIEL);
    expect(JSON.stringify(vue)).not.toContain(SECRET);
    expect(JSON.stringify(vue)).not.toContain(BRIEF_COMPLET);
  });

  it('un lien équipe retiré ne renvoie plus le détail sensible', () => {
    const vue = vueLien({ state: 'retired' }, rapport());
    const raw = JSON.stringify(vue);
    expect(vue?.access).toBe('retired');
    expect(vue?.brief).toBe('aucun');
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain(BRIEF_COMPLET);
    expect(raw).not.toContain('securite.hsts');
  });
});

describe('décision d’accès', () => {
  it('refuse sans créer de droit', () => {
    expect(
      decisionEquipe({ decision: 'refuse', role: 'rapport-brief', days: 30 }),
    ).toEqual({ ok: false, reason: 'refuse' });
  });

  it('accepte un rôle et une durée connus', () => {
    expect(
      decisionEquipe({ decision: 'accept', role: 'rapport-brief', days: 30 }),
    ).toEqual({ ok: true, avecBrief: true, days: 30 });
    expect(
      decisionEquipe({ decision: 'accept', role: 'rapport', days: 0 }),
    ).toEqual({ ok: true, avecBrief: false, days: 0 });
  });

  it('rejette un rôle ou une durée inconnue', () => {
    expect(
      decisionEquipe({ decision: 'accept', role: 'admin', days: 30 }).ok,
    ).toBe(false);
    expect(
      decisionEquipe({ decision: 'accept', role: 'rapport', days: 15 }).ok,
    ).toBe(false);
  });
});
