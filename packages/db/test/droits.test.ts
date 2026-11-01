import { describe, expect, it } from 'vitest';
import {
  A11Y_MENTION,
  clampAlerts,
  clientMaySetActionStatus,
  defaultAlerts,
  type FindingInput,
  gradeForScore,
  partialDomainCount,
  partialLabel,
  rightsFor,
  visibleDomain,
  visibleFinding,
  visibleGlobalGrade,
  withinLinkQuota,
  withinSiteQuota,
} from '../src/droits.js';

const anon = { kind: 'anon' } as const;
const freeOpen = {
  kind: 'account',
  plan: 'free',
  siteVerified: false,
} as const;
const freeProof = {
  kind: 'account',
  plan: 'free',
  siteVerified: true,
} as const;
const proOpen = {
  kind: 'account',
  plan: 'pro',
  siteVerified: false,
} as const;
const proProof = {
  kind: 'account',
  plan: 'pro',
  siteVerified: true,
} as const;
const linkPublic = { kind: 'link_public' } as const;
const teamOpen = { kind: 'link_team', ownerVerified: false } as const;
const teamProof = { kind: 'link_team', ownerVerified: true } as const;

const secret: FindingInput = {
  domain: 'securite',
  checkId: 'securite.hsts',
  status: 'fail',
  severity: 4,
  messageKey: 'finding.securite.hsts',
  measured: { header: 'secret-header-value' },
  fixKey: 'securite.hsts',
};

const seo: FindingInput = {
  domain: 'seo',
  checkId: 'seo.title',
  status: 'fail',
  severity: 2,
  messageKey: 'finding.seo.title',
  measured: { length: 12 },
  fixKey: 'seo.title',
};

describe('matrice des droits', () => {
  it('ferme la note globale et les domaines sensibles sans preuve', () => {
    for (const viewer of [anon, freeOpen, proOpen, linkPublic, teamOpen]) {
      const rights = rightsFor(viewer, { proofFresh: true });
      expect(rights.noteGlobale).toBe(false);
      expect(rights.notePartielle).toBe(true);
      expect(rights.domainesSensibles).toBe(false);
      expect(rights.commentCorrigerBranche).toBe(false);
      expect(rights.testsActifs).toBe(false);
      expect(rights.a11yMention).toBe(A11Y_MENTION);
      expect(visibleGlobalGrade(viewer, 'A')).toBeNull();
    }
  });

  it('ouvre le rapport complet après preuve, Pro compris', () => {
    for (const viewer of [freeProof, proProof, teamProof]) {
      const rights = rightsFor(viewer);
      expect(rights.noteGlobale).toBe(true);
      expect(rights.notePartielle).toBe(false);
      expect(rights.domainesSensibles).toBe(true);
      expect(rights.commentCorrigerBranche).toBe(true);
      expect(rights.a11yConformite).toBe(true);
      expect(rights.a11yMention).toBeNull();
      expect(visibleGlobalGrade(viewer, 'B')).toBe('B');
    }
    expect(rightsFor(freeProof).status).toBe('acct_verified');
    expect(rightsFor(proProof).status).toBe('pro');
    expect(rightsFor(proOpen).status).toBe('acct_unverified');
  });

  it('borne brief, export, sélection et tests actifs', () => {
    expect(rightsFor(anon).brief).toBe('aucun');
    expect(rightsFor(anon).exportBase).toBe(false);
    expect(rightsFor(linkPublic).brief).toBe('aucun');
    expect(rightsFor(linkPublic).selectionEdition).toBe(false);

    const open = rightsFor(freeOpen);
    expect(open.brief).toBe('partiel');
    expect(open.briefEdition).toBe(true);
    expect(open.exportBase).toBe(true);
    expect(open.selectionEdition).toBe(true);
    expect(open.testsActifs).toBe(false);
    expect(rightsFor(freeProof, { proofFresh: true }).testsActifs).toBe(true);
    expect(rightsFor(freeProof).testsActifs).toBe(false);

    const team = rightsFor(teamProof);
    expect(team.brief).toBe('complet');
    expect(team.briefEdition).toBe(false);
    expect(team.selectionEdition).toBe(false);
    expect(team.exportBase).toBe(false);
    expect(rightsFor(teamOpen).brief).toBe('partiel');
  });

  it('donne les plafonds et les alertes selon le plan, pas selon la preuve', () => {
    expect(rightsFor(anon).plafondSites).toBe(0);
    expect(rightsFor(freeOpen)).toMatchObject({
      plafondSites: 2,
      plafondLiensActifs: 1,
      reauditCadence: 'mensuel',
      sslReglable: false,
      extrasPro: false,
    });
    expect(rightsFor(proOpen)).toMatchObject({
      plafondSites: 10,
      plafondLiensActifs: null,
      reauditCadence: 'au_choix',
      sslReglable: true,
      seuilNoteReglable: true,
      extrasPro: true,
      domainesSensibles: false,
    });
    expect(withinSiteQuota('free', 1)).toBe(true);
    expect(withinSiteQuota('free', 2)).toBe(false);
    expect(withinSiteQuota('pro', 9)).toBe(true);
    expect(withinSiteQuota('pro', 10)).toBe(false);
    expect(withinLinkQuota('free', 0)).toBe(true);
    expect(withinLinkQuota('free', 1)).toBe(false);
    expect(withinLinkQuota('pro', 4)).toBe(true);
  });
});

describe('filtre de payload', () => {
  it('retire score, lettre et constat d’un domaine verrouillé', () => {
    const view = visibleDomain(freeOpen, {
      domain: 'securite',
      score: 12,
      grade: 'F',
      level: 'problem',
    });
    const json = JSON.stringify(view);
    expect(view.verrouille).toBe(true);
    expect(json).not.toContain('12');
    expect(json).not.toContain('F');
    expect(json).not.toContain('problem');
    expect(visibleFinding(proOpen, secret)).toBeNull();
    expect(visibleFinding(linkPublic, secret)).toBeNull();
  });

  it('garde le détail ouvert et retire le correctif branché sans preuve', () => {
    const kept = visibleFinding(freeOpen, seo);
    expect(kept?.measured).toEqual({ length: 12 });
    expect(kept?.fixKey).toBeNull();
    expect(visibleFinding(freeProof, seo)?.fixKey).toBe('seo.title');
    expect(visibleFinding(freeProof, secret)?.checkId).toBe('securite.hsts');

    const a11y = visibleDomain(anon, {
      domain: 'accessibilite',
      score: 80,
      grade: 'B',
      level: 'good',
    });
    expect(a11y.grade).toBe('B');
    expect(a11y.mention).toBe(A11Y_MENTION);
    expect(
      visibleDomain(freeProof, {
        domain: 'accessibilite',
        score: 80,
        grade: 'B',
        level: 'good',
      }).mention,
    ).toBeNull();
  });

  it('compte les domaines ouverts et pose le libellé canon', () => {
    expect(
      partialDomainCount([
        { domain: 'seo', score: 70 },
        { domain: 'securite', score: 10 },
        { domain: 'performance', score: null },
        { domain: 'reputation', score: 90 },
      ]),
    ).toBe(1);
    expect(partialLabel(4)).toBe('partielle · 4 domaines · site non vérifié');
  });

  it('aligne les lettres sur les seuils produit', () => {
    expect(gradeForScore(90)).toBe('A');
    expect(gradeForScore(80)).toBe('B');
    expect(gradeForScore(65)).toBe('C');
    expect(gradeForScore(50)).toBe('D');
    expect(gradeForScore(35)).toBe('E');
    expect(gradeForScore(34)).toBe('F');
    expect(gradeForScore(null)).toBeNull();
  });
});

describe('réglages et plan d’action', () => {
  it('fige le gratuit et borne le Pro', () => {
    expect(defaultAlerts('free')).toEqual({
      reauditCadence: 'monthly',
      sslWarnDays: 14,
      scoreDropPoints: 0,
      alertsEnabled: true,
    });
    expect(defaultAlerts('pro').reauditCadence).toBe('weekly');
    expect(
      clampAlerts('free', {
        reauditCadence: 'daily',
        sslWarnDays: 3,
        scoreDropPoints: 5,
        alertsEnabled: false,
      }),
    ).toEqual({
      reauditCadence: 'monthly',
      sslWarnDays: 14,
      scoreDropPoints: 0,
      alertsEnabled: false,
    });
    expect(
      clampAlerts('pro', {
        reauditCadence: 'daily',
        sslWarnDays: 200,
        scoreDropPoints: -4,
        alertsEnabled: true,
      }),
    ).toEqual({
      reauditCadence: 'daily',
      sslWarnDays: 90,
      scoreDropPoints: 0,
      alertsEnabled: true,
    });
  });

  it('refuse la clôture automatique depuis le client', () => {
    expect(clientMaySetActionStatus('todo')).toBe(true);
    expect(clientMaySetActionStatus('doing')).toBe(true);
    expect(clientMaySetActionStatus('done')).toBe(true);
    expect(clientMaySetActionStatus('auto_closed')).toBe(false);
  });
});
