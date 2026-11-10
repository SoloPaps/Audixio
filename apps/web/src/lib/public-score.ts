import {
  type Database,
  isLockedDomain,
  type Json,
  readPublicScore,
} from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditPayload } from './audit-api.js';
import { isKnownDomain } from './domains.js';
import { readLocalShare } from './local-share.js';

/** Exemple servi hors ligne en dev (Lighthouse, Playwright). */
export const EXAMPLE_SLUG = 'exemple-score';
export const EXAMPLE_INCOMPLETE_SLUG = 'exemple-score-partiel';
export const EXAMPLE_VERIFIED_SLUG = 'exemple-score-verifie';
export const EXAMPLE_SHARE = 'ab'.repeat(16);
export const REVOKED_SHARE = '00'.repeat(16);

const SLUG = /^[a-z0-9-]{8,64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const AUDIT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SecurityDetail {
  checkId: string;
  status: string;
  messageKey: string;
}

export interface PublicDomain {
  domain: string;
  score: number | null;
  level: string;
  /** Couverture déjà calculée, si la réponse la porte. */
  coverage: number | null;
  locked?: boolean;
}

export interface PublicFinding {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  impact: number;
  messageKey: string;
  fixKey: string | null;
}

/** Vue publique : scores seulement. `measured` n'est jamais recopié. */
export interface PublicScoreView {
  label: string;
  url: string;
  finishedAt: string | null;
  methodVersion: string | null;
  globalScore: number | null;
  auditId: string | null;
  domains: PublicDomain[];
  securityDetails: SecurityDetail[];
  /** Absent sur l’exemple hors ligne. `team` seulement pour un lien équipe ouvert. */
  access?: 'public' | 'team' | 'retired';
  briefText?: string | null;
  siteVerified?: boolean;
  siteId?: string | null;
  findings?: PublicFinding[];
}

export interface ShareRow {
  visibility: string;
  revokedAt: string | null;
}

/** Un lien `link` sans `revokedAt` est ouvert. Toute date le ferme. */
export function shareIsOpen(report: ShareRow | null): boolean {
  if (!report) return false;
  if (report.visibility !== 'link') return false;
  return report.revokedAt === null;
}

interface RawDetail {
  checkId?: unknown;
  check_id?: unknown;
  status?: unknown;
  messageKey?: unknown;
  message_key?: unknown;
  measured?: unknown;
}

export interface RawPublicScore {
  label: string;
  url: string;
  finishedAt: string | null;
  methodVersion: string | null;
  globalScore: number | null;
  auditId: string | null;
  exposeSecurity?: boolean;
  domains: readonly {
    domain: string;
    score: number | null;
    level?: string;
    coverage?: number | null;
    locked?: boolean;
  }[];
  securityDetails?: readonly RawDetail[];
}

function asScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function asCoverage(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function asDetails(
  rows: readonly RawDetail[] | undefined,
  expose: boolean,
): SecurityDetail[] {
  if (!expose || !rows) return [];
  const details: SecurityDetail[] = [];
  for (const row of rows) {
    const checkId = row.checkId ?? row.check_id;
    const messageKey = row.messageKey ?? row.message_key;
    if (typeof checkId !== 'string' || typeof row.status !== 'string') continue;
    if (typeof messageKey !== 'string') continue;
    details.push({ checkId, status: row.status, messageKey });
  }
  return details;
}

/**
 * Ne garde que les champs publics.
 * Sans `exposeSecurity`, le détail sécurité disparaît, même s'il est fourni.
 */
export function toPublicScore(
  raw: RawPublicScore,
  options?: { exposeSecurity?: boolean },
): PublicScoreView {
  const expose = options?.exposeSecurity === true;
  const domains: PublicDomain[] = [];
  for (const row of raw.domains) {
    if (!isKnownDomain(row.domain)) continue;
    domains.push({
      domain: row.domain,
      score: asScore(row.score),
      level: typeof row.level === 'string' ? row.level : 'untested',
      coverage: asCoverage(row.coverage),
    });
  }
  return {
    label: raw.label,
    url: raw.url,
    finishedAt: raw.finishedAt,
    methodVersion: raw.methodVersion,
    globalScore: asScore(raw.globalScore),
    auditId:
      raw.auditId !== null && AUDIT_ID.test(raw.auditId) ? raw.auditId : null,
    domains,
    securityDetails: asDetails(raw.securityDetails, expose),
  };
}

type RpcRow =
  Database['public']['Functions']['read_public_score']['Returns'][number];

function asRecordList(value: Json): RawDetail[] {
  if (!Array.isArray(value)) return [];
  const details: RawDetail[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    details.push({
      check_id: item.check_id,
      status: item.status,
      message_key: item.message_key,
      measured: item.measured,
    });
  }
  return details;
}

function asDomainList(value: Json): RawPublicScore['domains'] {
  if (!Array.isArray(value)) return [];
  const domains: RawPublicScore['domains'][number][] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const domain = item.domain;
    if (typeof domain !== 'string') continue;
    const row: {
      domain: string;
      score: number | null;
      level?: string;
      coverage?: number | null;
    } = {
      domain,
      score: typeof item.score === 'number' ? item.score : null,
    };
    if (typeof item.level === 'string') row.level = item.level;
    if (typeof item.coverage === 'number') row.coverage = item.coverage;
    if (item.locked === true) (row as { locked?: boolean }).locked = true;
    domains.push(row);
  }
  return domains;
}

function asPublicFindings(value: Json | null | undefined): PublicFinding[] {
  if (!Array.isArray(value)) return [];
  const rows: PublicFinding[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const domain = item.domain;
    const checkId = item.check_id ?? item.checkId;
    const status = item.status;
    const messageKey = item.message_key ?? item.messageKey;
    const severity = item.severity;
    const impact = item.impact;
    if (typeof domain !== 'string' || typeof checkId !== 'string') continue;
    if (typeof status !== 'string' || typeof messageKey !== 'string') continue;
    rows.push({
      domain,
      checkId,
      status,
      severity: typeof severity === 'number' ? severity : 1,
      impact: typeof impact === 'number' ? impact : 1,
      messageKey,
      fixKey:
        typeof item.fix_key === 'string'
          ? item.fix_key
          : typeof item.fixKey === 'string'
            ? item.fixKey
            : null,
    });
  }
  return rows;
}

type ScoreRowInput =
  | RpcRow
  | (Omit<RpcRow, 'findings' | 'site_verified' | 'site_id'> &
      Partial<Pick<RpcRow, 'findings' | 'site_verified' | 'site_id'>>);

export function fromScoreRow(row: ScoreRowInput): RawPublicScore {
  return {
    label: row.site_label,
    url: row.site_url,
    finishedAt: row.finished_at,
    methodVersion: row.method_version,
    globalScore: row.global_score,
    auditId: row.audit_id,
    exposeSecurity: row.expose_security,
    domains: asDomainList(row.domains),
    securityDetails: asRecordList(row.security_details),
  };
}

export function presentRow(row: ScoreRowInput): PublicScoreView {
  const raw = fromScoreRow(row);
  const verified = row.site_verified === true;
  const view = toPublicScore(raw, { exposeSecurity: false });
  const domains = verified
    ? raw.domains
        .filter((item) => isKnownDomain(item.domain))
        .map((item) => ({
          domain: item.domain,
          score: item.score,
          level: typeof item.level === 'string' ? item.level : 'untested',
          coverage: item.coverage ?? null,
          locked: item.locked === true || isLockedDomain(item.domain),
        }))
    : view.domains.filter((item) => !isLockedDomain(item.domain));
  return {
    ...view,
    globalScore: raw.globalScore,
    securityDetails: [],
    domains,
    siteVerified: verified,
    siteId: row.site_id ?? null,
    findings: verified ? asPublicFindings(row.findings) : [],
  };
}

const EXAMPLE_AUDIT = '00000000-0000-4000-8000-000000000019';

/** Charge utile d'exemple, avec une fuite volontaire à filtrer. */
export function exampleRaw(): RawPublicScore {
  return {
    label: 'Exemple',
    url: 'https://exemple.fr',
    finishedAt: '2026-10-23T08:00:00.000Z',
    methodVersion: '2026.1',
    // 65 = scoreGlobal des 8 domaines principaux : 5 ouverts à 80 + 3 verrouillés à 40.
    globalScore: 65,
    auditId: EXAMPLE_AUDIT,
    exposeSecurity: false,
    domains: [
      { domain: 'performance', score: 80, level: 'good' },
      { domain: 'seo', score: 80, level: 'good' },
      { domain: 'ecologie', score: 80, level: 'good' },
      { domain: 'accessibilite', score: 80, level: 'good' },
      { domain: 'qualite', score: 80, level: 'good' },
      { domain: 'inconnu', score: 10, level: 'problem' },
    ],
    securityDetails: [
      {
        check_id: 'securite.hsts',
        status: 'fail',
        message_key: 'finding.securite.hsts',
        measured: 'fuite-hsts-mesure-secrete',
      },
    ],
  };
}

export function exampleView(): PublicScoreView {
  const raw = exampleRaw();
  return toPublicScore(raw, { exposeSecurity: raw.exposeSecurity === true });
}

/** Même site, mais deux domaines ouverts encore sans note : message différé #188. */
export function exampleIncompleteRaw(): RawPublicScore {
  const raw = exampleRaw();
  return {
    ...raw,
    globalScore: 80,
    domains: [
      { domain: 'performance', score: 80, level: 'good' },
      { domain: 'seo', score: 80, level: 'good' },
      { domain: 'ecologie', score: 80, level: 'good' },
      { domain: 'accessibilite', score: null, level: 'untested' },
      { domain: 'qualite', score: null, level: 'untested' },
    ],
  };
}

export function exampleIncompleteView(): PublicScoreView {
  const raw = exampleIncompleteRaw();
  return toPublicScore(raw, { exposeSecurity: false });
}

/** Même site, vérifié : le lien public montre le détail des constats. */
export function exampleVerifiedView(): PublicScoreView {
  const view = exampleView();
  return {
    ...view,
    siteVerified: true,
    siteId: '00000000-0000-4000-8000-000000000019',
    domains: [
      ...view.domains,
      {
        domain: 'securite',
        score: 40,
        level: 'problem',
        coverage: null,
        locked: false,
      },
    ],
    findings: [
      {
        domain: 'securite',
        checkId: 'securite.hsts',
        status: 'fail',
        severity: 4,
        impact: 3,
        messageKey: 'securite.hsts.fail_missing',
        fixKey: 'securite.hsts',
      },
    ],
  };
}

export function payloadFromPublicView(view: PublicScoreView): AuditPayload {
  const when = view.finishedAt ?? '2026-10-23T08:00:00.000Z';
  const verified = view.siteVerified === true;
  return {
    audit: {
      id: view.auditId ?? '00000000-0000-4000-8000-000000000000',
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: view.methodVersion ?? '2026.1',
      engineVersion: 'public',
      globalScore: view.globalScore,
      siteVerified: verified,
      partialLabel: null,
      coverage: null,
      createdAt: when,
      startedAt: when,
      finishedAt: view.finishedAt,
      error: null,
      site: {
        id: view.siteId ?? '00000000-0000-4000-8000-000000000000',
        url: view.url,
        label: view.label,
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: view.domains.map((item) => ({
      domain: item.domain,
      score: item.score,
      coverage: item.coverage ?? 1,
      level: item.level,
      locked: item.locked === true,
    })),
    findings: (view.findings ?? []).map((item) => ({
      domain: item.domain,
      checkId: item.checkId,
      status: item.status,
      severity: item.severity,
      impact: item.impact,
      score: null,
      measured: {},
      messageKey: item.messageKey,
      params: {},
      fixKey: item.fixKey,
      effortMinutes: null,
      reason: null,
    })),
  };
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Badge autonome : aucune adresse, aucun script, aucun cookie. */
export function scoreBadgeSvg(label: string, score: number | null): string {
  const shown = score === null ? '—' : String(score);
  const name = xml(label.slice(0, 42));
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img">',
    `<title>Audixio ${xml(shown)}</title>`,
    '<rect x="1" y="1" width="238" height="62" fill="none" stroke="currentColor"/>',
    `<text x="16" y="28" fill="currentColor" font-family="sans-serif" font-size="16">${name}</text>`,
    `<text x="16" y="50" fill="currentColor" font-family="sans-serif" font-size="14">Audixio ${xml(shown)}</text>`,
    '</svg>',
  ].join('');
}

export function badgeHasTracker(svg: string): boolean {
  if (svg.includes('<script') || svg.includes('cookie')) return true;
  // Seul l’espace de noms SVG du W3C est admis : hôte comparé exactement, casse ignorée.
  for (const [link] of svg.matchAll(
    /(?:[a-z][a-z\d+.-]*:)?\/\/[^\s\u0022\u0027<>()]*/gi,
  )) {
    let url: URL;
    try {
      url = new URL(link, 'https://badge.invalid');
    } catch {
      return true;
    }
    if (url.hostname !== 'www.w3.org') return true;
  }
  return false;
}

type ScoreClient = SupabaseClient<Database>;

export async function loadPublicScore(
  client: ScoreClient | null,
  slug: string,
): Promise<PublicScoreView | null> {
  if (!SLUG.test(slug)) return null;
  if (import.meta.env.DEV && slug === EXAMPLE_SLUG) return exampleView();
  if (import.meta.env.DEV && slug === EXAMPLE_INCOMPLETE_SLUG)
    return exampleIncompleteView();
  if (import.meta.env.DEV && slug === EXAMPLE_VERIFIED_SLUG)
    return exampleVerifiedView();
  if (!client) return null;
  const row = await readPublicScore(client, slug);
  return row ? presentRow(row) : null;
}

interface ShareApiBody {
  access?: unknown;
  brief?: unknown;
  label?: unknown;
  url?: unknown;
  finishedAt?: unknown;
  methodVersion?: unknown;
  auditId?: unknown;
  noteGlobale?: unknown;
  domaines?: unknown;
  constats?: unknown;
  briefTexte?: unknown;
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Reprend la vue API et retire encore les champs interdits.
 * Un lien public garde la note globale et les domaines ouverts.
 * Il retire le brief, les domaines verrouillés et les mesures.
 */
export function fromShareApi(body: ShareApiBody): PublicScoreView | null {
  const access = body.access;
  if (access !== 'public' && access !== 'team' && access !== 'retired') {
    return null;
  }
  const team = access === 'team';
  const domains: PublicDomain[] = [];
  if (Array.isArray(body.domaines)) {
    for (const row of body.domaines) {
      if (!row || typeof row !== 'object') continue;
      const domain = textOf((row as { domain?: unknown }).domain);
      if (!isKnownDomain(domain)) continue;
      const locked =
        (row as { verrouille?: unknown }).verrouille === true ||
        isLockedDomain(domain);
      if (!team && locked) continue;
      const score = (row as { score?: unknown }).score;
      domains.push({
        domain,
        score:
          typeof score === 'number' && Number.isFinite(score)
            ? Math.round(score)
            : null,
        level: '',
        coverage: null,
      });
    }
  }
  const securityDetails: SecurityDetail[] = [];
  if (team && Array.isArray(body.constats)) {
    for (const row of body.constats) {
      if (!row || typeof row !== 'object') continue;
      const domain = textOf((row as { domain?: unknown }).domain);
      const checkId = textOf((row as { checkId?: unknown }).checkId);
      const status = textOf((row as { status?: unknown }).status);
      const messageKey = textOf((row as { messageKey?: unknown }).messageKey);
      if (!isLockedDomain(domain) || !checkId || !status || !messageKey)
        continue;
      securityDetails.push({ checkId, status, messageKey });
    }
  }
  const note = body.noteGlobale;
  const showNote = access === 'public' || team;
  return {
    label: textOf(body.label),
    url: textOf(body.url),
    finishedAt: typeof body.finishedAt === 'string' ? body.finishedAt : null,
    methodVersion:
      typeof body.methodVersion === 'string' ? body.methodVersion : null,
    globalScore:
      showNote && typeof note === 'number' && Number.isFinite(note)
        ? Math.round(note)
        : null,
    auditId: typeof body.auditId === 'string' ? body.auditId : null,
    domains,
    securityDetails,
    access,
    briefText:
      team && typeof body.briefTexte === 'string' ? body.briefTexte : null,
  };
}

export function viewFromAudit(payload: AuditPayload): PublicScoreView {
  return {
    label: payload.audit.site.label,
    url: payload.audit.site.url,
    finishedAt: payload.audit.finishedAt,
    methodVersion: payload.audit.methodVersion,
    globalScore: payload.audit.globalScore,
    auditId: payload.audit.id,
    domains: payload.domains
      .filter(
        (item) => isKnownDomain(item.domain) && !isLockedDomain(item.domain),
      )
      .map((item) => ({
        domain: item.domain,
        score: item.score,
        level: item.level,
        coverage: item.coverage,
      })),
    securityDetails: [],
    access: 'public',
    briefText: null,
  };
}

function viewFromLocal(token: string): PublicScoreView | null {
  const stored = readLocalShare(token);
  return stored ? viewFromAudit(stored) : null;
}

export async function loadSharedScore(
  client: ScoreClient | null,
  token: string,
): Promise<PublicScoreView | null> {
  void client;
  if (!TOKEN.test(token)) return null;
  if (import.meta.env.DEV && token === REVOKED_SHARE) {
    const closed: ShareRow = {
      visibility: 'link',
      revokedAt: new Date().toISOString(),
    };
    return shareIsOpen(closed) ? exampleView() : null;
  }
  if (import.meta.env.DEV && token === EXAMPLE_SHARE) {
    const open: ShareRow = { visibility: 'link', revokedAt: null };
    return shareIsOpen(open) ? exampleView() : null;
  }
  try {
    const response = await fetch('/api/partage', {
      method: 'post'.toUpperCase(),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) return viewFromLocal(token);
    return (
      fromShareApi((await response.json()) as ShareApiBody) ??
      viewFromLocal(token)
    );
  } catch {
    return viewFromLocal(token);
  }
}

/** Affichage de la note globale sur /score. */
export type PublicGlobalDisplay = 'score' | 'deferred' | 'untested';

/**
 * La vraie note (chiffre + lettre, même jauge que le rapport) s’affiche seulement
 * si elle est connue et si tous les domaines ouverts sont notés (ex. 5/5).
 * Sinon, dès qu’au moins un domaine ouvert est noté, on garde le libellé #188.
 */
export function publicGlobalDisplay(
  globalScore: number | null,
  scoredOpenDomains: number,
  totalOpenDomains: number,
): PublicGlobalDisplay {
  if (
    globalScore !== null &&
    totalOpenDomains > 0 &&
    scoredOpenDomains >= totalOpenDomains
  ) {
    return 'score';
  }
  if (scoredOpenDomains > 0) return 'deferred';
  return 'untested';
}
