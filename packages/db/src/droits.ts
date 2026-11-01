/**
 * Droits serveur : qui voit quoi.
 * Source : docs/produit/MATRICE-STATUT-DROITS-CANON.md
 * et docs/produit/SOFT-GATE-PARTIEL-CANON.md.
 *
 * Un compte Pro sans preuve sur CE site reste en soft-gate partiel
 * pour le rapport. Le plan ne débloque pas les domaines sensibles.
 * Les extras Pro (plafond, alertes réglables) suivent le plan.
 */

export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Grade = (typeof GRADES)[number];

/** Domaines détaillés sans preuve. */
export const OPEN_DOMAINS = [
  'performance',
  'seo',
  'ecologie',
  'qualite',
  'accessibilite',
] as const;

/** Absents du payload tant que le site n'est pas prouvé. */
export const LOCKED_DOMAINS = ['securite', 'vie_privee', 'dns_email'] as const;

/** Hors des 8 cartes. Visibles, non sensibles, hors du décompte N. */
export const EXTRA_DOMAINS = ['reputation', 'disponibilite'] as const;

export const ACCESS_STATUSES = [
  'anon',
  'acct_unverified',
  'acct_verified',
  'pro',
  'link_public',
  'link_team',
] as const;
export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export const FREE_SITE_CAP = 2;
export const PRO_SITE_CAP = 10;
export const FREE_LINK_CAP = 1;
export const FREE_SSL_WARN_DAYS = 14;

export const A11Y_MENTION = 'mesure automatique / partielle';

export const REAUDIT_CADENCES = ['daily', 'weekly', 'monthly'] as const;
export type ReauditCadence = (typeof REAUDIT_CADENCES)[number];

export const ACTION_STATUSES = [
  'todo',
  'doing',
  'done',
  'auto_closed',
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const CLIENT_ACTION_STATUSES = ['todo', 'doing', 'done'] as const;

export type Viewer =
  | { kind: 'anon' }
  | { kind: 'account'; plan: Plan; siteVerified: boolean }
  | { kind: 'link_public' }
  | { kind: 'link_team'; ownerVerified: boolean };

export type BriefLevel = 'aucun' | 'partiel' | 'complet';

export interface Rights {
  status: AccessStatus;
  plan: Plan | null;
  noteGlobale: boolean;
  notePartielle: boolean;
  detailOuvert: boolean;
  a11yConformite: boolean;
  a11yMention: string | null;
  domainesSensibles: boolean;
  brief: BriefLevel;
  briefEdition: boolean;
  commentCorrigerBranche: boolean;
  guidesGeneriques: boolean;
  exportBase: boolean;
  selectionEdition: boolean;
  testsActifs: boolean;
  extrasPro: boolean;
  plafondSites: number;
  /** `null` : plafond Pro non chiffré (matrice : « plus haut »). */
  plafondLiensActifs: number | null;
  reauditCadence: 'aucun' | 'mensuel' | 'au_choix';
  sslReglable: boolean;
  seuilNoteReglable: boolean;
}

export interface DomainInput {
  domain: string;
  score: number | null;
  grade: Grade | null;
  level: string | null;
}

export interface DomainView {
  domain: string;
  verrouille: boolean;
  score: number | null;
  grade: Grade | null;
  level: string | null;
  mention: string | null;
}

export interface FindingInput {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  messageKey: string;
  measured: unknown;
  fixKey: string | null;
}

export interface AlertChoice {
  reauditCadence: ReauditCadence;
  sslWarnDays: number;
  scoreDropPoints: number;
  alertsEnabled: boolean;
}

const OPEN = new Set<string>(OPEN_DOMAINS);
const LOCKED = new Set<string>(LOCKED_DOMAINS);
const EXTRA = new Set<string>(EXTRA_DOMAINS);

/** Seuils alignés sur `apps/web/src/lib/grade.ts`. */
export function gradeForScore(score: number | null): Grade | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  if (score >= 35) return 'E';
  return 'F';
}

export function isLockedDomain(domain: string): boolean {
  return LOCKED.has(domain);
}

export function isOpenDomain(domain: string): boolean {
  return OPEN.has(domain);
}

export function seesFullReport(viewer: Viewer): boolean {
  if (viewer.kind === 'account') return viewer.siteVerified;
  if (viewer.kind === 'link_team') return viewer.ownerVerified;
  return false;
}

export function accessStatus(viewer: Viewer): AccessStatus {
  if (viewer.kind === 'anon') return 'anon';
  if (viewer.kind === 'link_public') return 'link_public';
  if (viewer.kind === 'link_team') return 'link_team';
  if (!viewer.siteVerified) return 'acct_unverified';
  return viewer.plan === 'pro' ? 'pro' : 'acct_verified';
}

function planOf(viewer: Viewer): Plan | null {
  return viewer.kind === 'account' ? viewer.plan : null;
}

export function partialLabel(openDomainCount: number): string {
  return `partielle · ${openDomainCount} domaines · site non vérifié`;
}

export function partialDomainCount(
  rows: readonly { domain: string; score: number | null }[],
): number {
  return rows.filter((row) => isOpenDomain(row.domain) && row.score !== null)
    .length;
}

/**
 * @param proofFresh propriété revérifiée il y a moins de 10 minutes.
 * Sans ce drapeau, les tests actifs restent fermés.
 */
export function rightsFor(
  viewer: Viewer,
  options?: { proofFresh?: boolean },
): Rights {
  const full = seesFullReport(viewer);
  const account = viewer.kind === 'account';
  const plan = planOf(viewer);
  const pro = plan === 'pro';
  const fresh = options?.proofFresh === true;

  let brief: BriefLevel = 'aucun';
  let briefEdition = false;
  if (account && viewer.siteVerified) {
    brief = 'complet';
    briefEdition = true;
  } else if (account) {
    brief = 'partiel';
    briefEdition = true;
  } else if (viewer.kind === 'link_team') {
    brief = viewer.ownerVerified ? 'complet' : 'partiel';
    briefEdition = false;
  }

  return {
    status: accessStatus(viewer),
    plan,
    noteGlobale: full,
    notePartielle: !full,
    detailOuvert: true,
    a11yConformite: full,
    a11yMention: full ? null : A11Y_MENTION,
    domainesSensibles: full,
    brief,
    briefEdition,
    commentCorrigerBranche: full,
    guidesGeneriques: true,
    exportBase: account,
    selectionEdition: account,
    testsActifs: account && viewer.siteVerified && fresh,
    extrasPro: pro,
    plafondSites: account ? (pro ? PRO_SITE_CAP : FREE_SITE_CAP) : 0,
    plafondLiensActifs: account ? (pro ? null : FREE_LINK_CAP) : 0,
    reauditCadence: account ? (pro ? 'au_choix' : 'mensuel') : 'aucun',
    sslReglable: pro,
    seuilNoteReglable: pro,
  };
}

export function visibleGlobalGrade(
  viewer: Viewer,
  grade: Grade | null,
): Grade | null {
  return seesFullReport(viewer) ? grade : null;
}

export function visibleDomain(viewer: Viewer, row: DomainInput): DomainView {
  const full = seesFullReport(viewer);
  const known =
    OPEN.has(row.domain) || LOCKED.has(row.domain) || EXTRA.has(row.domain);
  if (!known || (isLockedDomain(row.domain) && !full)) {
    return {
      domain: row.domain,
      verrouille: true,
      score: null,
      grade: null,
      level: null,
      mention: null,
    };
  }
  return {
    domain: row.domain,
    verrouille: false,
    score: row.score,
    grade: row.grade,
    level: row.level,
    mention: row.domain === 'accessibilite' && !full ? A11Y_MENTION : null,
  };
}

/** `null` : le constat ne doit pas quitter le serveur. */
export function visibleFinding(
  viewer: Viewer,
  finding: FindingInput,
): FindingInput | null {
  if (
    visibleDomain(viewer, {
      domain: finding.domain,
      score: null,
      grade: null,
      level: null,
    }).verrouille
  ) {
    return null;
  }
  if (!seesFullReport(viewer)) return { ...finding, fixKey: null };
  return finding;
}

export function defaultAlerts(plan: Plan): AlertChoice {
  return {
    reauditCadence: plan === 'pro' ? 'weekly' : 'monthly',
    sslWarnDays: FREE_SSL_WARN_DAYS,
    scoreDropPoints: 0,
    alertsEnabled: true,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Le gratuit ne peut pas sortir des défauts. Le Pro reste dans les bornes. */
export function clampAlerts(plan: Plan, choice: AlertChoice): AlertChoice {
  if (plan !== 'pro') {
    return { ...defaultAlerts('free'), alertsEnabled: choice.alertsEnabled };
  }
  const cadence = (REAUDIT_CADENCES as readonly string[]).includes(
    choice.reauditCadence,
  )
    ? choice.reauditCadence
    : 'weekly';
  return {
    reauditCadence: cadence,
    sslWarnDays: clampInt(choice.sslWarnDays, 1, 90),
    scoreDropPoints: clampInt(choice.scoreDropPoints, 0, 40),
    alertsEnabled: choice.alertsEnabled,
  };
}

export function withinSiteQuota(plan: Plan, activeSites: number): boolean {
  const cap = plan === 'pro' ? PRO_SITE_CAP : FREE_SITE_CAP;
  return activeSites < cap;
}

export function withinLinkQuota(plan: Plan, activeLinks: number): boolean {
  if (plan === 'pro') return true;
  return activeLinks < FREE_LINK_CAP;
}

export function clientMaySetActionStatus(status: string): boolean {
  return (CLIENT_ACTION_STATUSES as readonly string[]).includes(status);
}
