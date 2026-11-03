import {
  type BriefLevel,
  type DomainInput,
  type Grade,
  type Plan,
  rightsFor,
  seesFullReport,
  visibleDomain,
  visibleFinding,
  visibleGlobalGrade,
  withinLinkQuota,
} from './droits.js';

export const PUBLIC_LINK_DAYS = 30;
export const TEAM_DAY_CHOICES = [0, 7, 30, 90] as const;
export const SHARE_TOKEN = /^[0-9a-f]{32}$/;

export type LinkKind = 'public' | 'team';

export interface LinkRecord {
  id: string;
  auditId: string;
  ownerId: string;
  kind: LinkKind;
  tokenHash: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  ownerVerified: boolean;
  avecBrief: boolean;
}

export interface LienFinding {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  messageKey: string;
  measured: unknown;
  fixKey: string | null;
}

export interface LienRapport {
  label: string;
  url: string;
  finishedAt: string | null;
  methodVersion: string | null;
  globalScore: number | null;
  globalGrade: Grade | null;
  auditId: string;
  domains: DomainInput[];
  findings: LienFinding[];
  briefPartiel: string | null;
  briefComplet: string | null;
}

export type LinkGate =
  | { state: 'closed' }
  | { state: 'public' }
  | { state: 'retired' }
  | { state: 'team'; ownerVerified: boolean; avecBrief: boolean };

export interface LienVue {
  access: 'public' | 'team' | 'retired';
  brief: BriefLevel;
  label: string;
  url: string;
  finishedAt: string | null;
  methodVersion: string | null;
  auditId: string;
  noteGlobale: number | null;
  grade: Grade | null;
  domaines: {
    domain: string;
    score: number | null;
    grade: Grade | null;
    verrouille: boolean;
  }[];
  constats: LienFinding[];
  briefTexte: string | null;
}

/** 16 octets aléatoires → jeton hex de 128 bits. */
export function shareTokenFromBytes(bytes: Uint8Array): string {
  if (bytes.byteLength !== 16) throw new Error('token_bytes');
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function expiresAt(
  kind: LinkKind,
  created: Date,
  days: number,
): string | null {
  const span = kind === 'public' ? PUBLIC_LINK_DAYS : days;
  if (span === 0) return null;
  return new Date(created.getTime() + span * 86_400_000).toISOString();
}

function ended(link: LinkRecord, now: Date): boolean {
  if (link.revokedAt !== null) return true;
  if (link.expiresAt === null) return false;
  return Date.parse(link.expiresAt) <= now.getTime();
}

export function lienActif(link: LinkRecord, now: Date): boolean {
  return !ended(link, now);
}

export function gateLink(link: LinkRecord | null, now: Date): LinkGate {
  if (!link) return { state: 'closed' };
  const dead = ended(link, now);
  if (link.kind === 'public')
    return dead ? { state: 'closed' } : { state: 'public' };
  if (dead) return { state: 'retired' };
  return {
    state: 'team',
    ownerVerified: link.ownerVerified,
    avecBrief: link.avecBrief,
  };
}

export function peutCreerLien(plan: Plan, actifs: number): boolean {
  return withinLinkQuota(plan, actifs);
}

export function decisionEquipe(input: {
  decision: string;
  role: string;
  days: number;
}):
  | { ok: false; reason: 'invalid' | 'refuse' }
  | { ok: true; avecBrief: boolean; days: number } {
  if (input.decision === 'refuse') return { ok: false, reason: 'refuse' };
  if (input.decision !== 'accept') return { ok: false, reason: 'invalid' };
  if (input.role !== 'rapport' && input.role !== 'rapport-brief') {
    return { ok: false, reason: 'invalid' };
  }
  if (!(TEAM_DAY_CHOICES as readonly number[]).includes(input.days)) {
    return { ok: false, reason: 'invalid' };
  }
  return {
    ok: true,
    avecBrief: input.role === 'rapport-brief',
    days: input.days,
  };
}

/** Payload selon la porte. `null` : le lien public est mort, rien ne sort. */
export function vueLien(gate: LinkGate, rapport: LienRapport): LienVue | null {
  if (gate.state === 'closed') return null;
  const viewer =
    gate.state === 'team'
      ? { kind: 'link_team' as const, ownerVerified: gate.ownerVerified }
      : { kind: 'link_public' as const };
  const rights = rightsFor(viewer);
  const full = seesFullReport(viewer);
  const avecBrief = gate.state === 'team' && gate.avecBrief;
  const brief: BriefLevel = avecBrief ? rights.brief : 'aucun';
  let briefTexte: string | null = null;
  if (brief === 'complet') briefTexte = rapport.briefComplet;
  if (brief === 'partiel') briefTexte = rapport.briefPartiel;
  const constats: LienFinding[] = [];
  for (const finding of rapport.findings) {
    const visible = visibleFinding(viewer, finding);
    if (!visible) continue;
    constats.push({
      domain: visible.domain,
      checkId: visible.checkId,
      status: visible.status,
      severity: visible.severity,
      messageKey: visible.messageKey,
      measured: visible.measured,
      fixKey: visible.fixKey,
    });
  }
  return {
    access: gate.state === 'team' ? 'team' : gate.state,
    brief,
    label: rapport.label,
    url: rapport.url,
    finishedAt: rapport.finishedAt,
    methodVersion: rapport.methodVersion,
    auditId: rapport.auditId,
    noteGlobale: full || gate.state === 'public' ? rapport.globalScore : null,
    grade: visibleGlobalGrade(viewer, rapport.globalGrade),
    domaines: rapport.domains.map((row) => {
      const view = visibleDomain(viewer, row);
      return {
        domain: view.domain,
        score: view.score,
        grade: view.grade,
        verrouille: view.verrouille,
      };
    }),
    constats,
    briefTexte,
  };
}
