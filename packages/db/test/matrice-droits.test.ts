import { describe, expect, it } from 'vitest';
import {
  A11Y_MENTION,
  type Rights,
  rightsFor,
  type Viewer,
  withinLinkQuota,
} from '../src/index.js';

const anon: Viewer = { kind: 'anon' };
const freeOpen: Viewer = {
  kind: 'account',
  plan: 'free',
  siteVerified: false,
};
const freeProof: Viewer = {
  kind: 'account',
  plan: 'free',
  siteVerified: true,
};
const proOpen: Viewer = {
  kind: 'account',
  plan: 'pro',
  siteVerified: false,
};
const proProof: Viewer = {
  kind: 'account',
  plan: 'pro',
  siteVerified: true,
};
const linkPublic: Viewer = { kind: 'link_public' };
const teamOpen: Viewer = { kind: 'link_team', ownerVerified: false };
const teamProof: Viewer = { kind: 'link_team', ownerVerified: true };

const lockedReport = {
  noteGlobale: false,
  notePartielle: true,
  detailOuvert: true,
  a11yConformite: false,
  a11yMention: A11Y_MENTION,
  domainesSensibles: false,
  commentCorrigerBranche: false,
  guidesGeneriques: true,
  testsActifs: false,
} as const;

const openReport = {
  noteGlobale: true,
  notePartielle: false,
  detailOuvert: true,
  a11yConformite: true,
  a11yMention: null,
  domainesSensibles: true,
  commentCorrigerBranche: true,
  guidesGeneriques: true,
} as const;

function expectRights(
  viewer: Viewer,
  expected: Rights,
  options?: { proofFresh?: boolean },
): void {
  expect(rightsFor(viewer, options)).toEqual(expected);
}

describe('matrice statut × capacités (rightsFor)', () => {
  it('visiteur : pas d’export, pas de brief, plafonds à zéro, rapport partiel', () => {
    expectRights(anon, {
      status: 'anon',
      plan: null,
      ...lockedReport,
      brief: 'aucun',
      briefEdition: false,
      exportBase: false,
      selectionEdition: false,
      extrasPro: false,
      plafondSites: 0,
      plafondLiensActifs: 0,
      reauditCadence: 'aucun',
      sslReglable: false,
      seuilNoteReglable: false,
    });
  });

  it('compte gratuit non vérifié : brief partiel, export de base, 2 sites / 1 lien', () => {
    expectRights(freeOpen, {
      status: 'acct_unverified',
      plan: 'free',
      ...lockedReport,
      brief: 'partiel',
      briefEdition: true,
      exportBase: true,
      selectionEdition: true,
      extrasPro: false,
      plafondSites: 2,
      plafondLiensActifs: 1,
      reauditCadence: 'mensuel',
      sslReglable: false,
      seuilNoteReglable: false,
    });
    expect(rightsFor(freeOpen, { proofFresh: true }).testsActifs).toBe(false);
  });

  it('compte gratuit vérifié : rapport complet, tests actifs seulement si preuve fraîche', () => {
    expectRights(freeProof, {
      status: 'acct_verified',
      plan: 'free',
      ...openReport,
      testsActifs: false,
      brief: 'complet',
      briefEdition: true,
      exportBase: true,
      selectionEdition: true,
      extrasPro: false,
      plafondSites: 2,
      plafondLiensActifs: 1,
      reauditCadence: 'mensuel',
      sslReglable: false,
      seuilNoteReglable: false,
    });
    expect(rightsFor(freeProof, { proofFresh: true }).testsActifs).toBe(true);
  });

  it('compte Pro non vérifié : extras plan, mais soft-gate du rapport', () => {
    expectRights(proOpen, {
      status: 'acct_unverified',
      plan: 'pro',
      ...lockedReport,
      brief: 'partiel',
      briefEdition: true,
      exportBase: true,
      selectionEdition: true,
      extrasPro: true,
      plafondSites: 10,
      plafondLiensActifs: null,
      reauditCadence: 'au_choix',
      sslReglable: true,
      seuilNoteReglable: true,
    });
  });

  it('compte Pro vérifié : statut pro, extras, tests actifs si preuve fraîche', () => {
    expectRights(
      proProof,
      {
        status: 'pro',
        plan: 'pro',
        ...openReport,
        testsActifs: true,
        brief: 'complet',
        briefEdition: true,
        exportBase: true,
        selectionEdition: true,
        extrasPro: true,
        plafondSites: 10,
        plafondLiensActifs: null,
        reauditCadence: 'au_choix',
        sslReglable: true,
        seuilNoteReglable: true,
      },
      { proofFresh: true },
    );
    expect(rightsFor(proProof).testsActifs).toBe(false);
  });

  it('compte Pro : liens de partage illimités (décision owner, sans migration)', () => {
    expect(rightsFor(proOpen).plafondLiensActifs).toBeNull();
    expect(rightsFor(proProof).plafondLiensActifs).toBeNull();
    expect(withinLinkQuota('pro', 0)).toBe(true);
    expect(withinLinkQuota('pro', 1)).toBe(true);
    expect(withinLinkQuota('pro', 1_000)).toBe(true);
  });

  it('lien public : lecture limitée, pas de brief ni d’export', () => {
    expectRights(linkPublic, {
      status: 'link_public',
      plan: null,
      ...lockedReport,
      brief: 'aucun',
      briefEdition: false,
      exportBase: false,
      selectionEdition: false,
      extrasPro: false,
      plafondSites: 0,
      plafondLiensActifs: 0,
      reauditCadence: 'aucun',
      sslReglable: false,
      seuilNoteReglable: false,
    });
  });

  it('lien équipe : brief selon la preuve du proprio, jamais d’édition ni d’export', () => {
    expectRights(teamOpen, {
      status: 'link_team',
      plan: null,
      ...lockedReport,
      brief: 'partiel',
      briefEdition: false,
      exportBase: false,
      selectionEdition: false,
      extrasPro: false,
      plafondSites: 0,
      plafondLiensActifs: 0,
      reauditCadence: 'aucun',
      sslReglable: false,
      seuilNoteReglable: false,
    });
    expectRights(teamProof, {
      status: 'link_team',
      plan: null,
      ...openReport,
      testsActifs: false,
      brief: 'complet',
      briefEdition: false,
      exportBase: false,
      selectionEdition: false,
      extrasPro: false,
      plafondSites: 0,
      plafondLiensActifs: 0,
      reauditCadence: 'aucun',
      sslReglable: false,
      seuilNoteReglable: false,
    });
  });
});
