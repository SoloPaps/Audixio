import { t } from '../i18n/index.js';
import type { AuditPayload } from './audit-api.js';
import { gradeForScore } from './grade.js';

const SENSITIVE = new Set(['securite', 'vie_privee', 'dns_email']);

export const ACTION_STATUSES = ['todo', 'doing', 'done'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export type ShareGesture = 'native' | 'dialog';
export type SeverityTone = 'crit' | 'fix' | 'check' | 'minor';
export type FailureKind = 'failed' | 'denied' | 'down';

export function isActionStatus(value: string): value is ActionStatus {
  return value === 'todo' || value === 'doing' || value === 'done';
}

export function hostLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//u, '').split('/')[0] ?? url;
  }
}

/** Ancre de la carte constat, identique à `FindingList`. */
export function priorityHref(
  auditId: string,
  domain: string,
  findingId: string,
): string {
  return `/domaine?id=${encodeURIComponent(auditId)}&domaine=${encodeURIComponent(domain)}#finding-${findingId}`;
}

export function detailHref(auditId: string, findingId: string): string {
  return `/constat?id=${encodeURIComponent(auditId)}&check=${encodeURIComponent(findingId)}`;
}

export function planHref(auditId: string): string {
  return `/plan?id=${encodeURIComponent(auditId)}`;
}

export function badgeHref(auditId: string): string {
  return `/badge?id=${encodeURIComponent(auditId)}`;
}

export function verifyHref(siteId: string): string {
  return `/verifier?site=${encodeURIComponent(siteId)}`;
}

/**
 * Libellé de la nav des domaines : lettre ou verrou, jamais un score /100.
 */
export function domainNavLabel(
  name: string,
  score: number | null,
  locked: boolean,
): string {
  if (locked) return `${name}, ${t('domain.locked.badge')}`;
  const grade = gradeForScore(score);
  if (!grade) return name;
  return `${name}, ${t('report.grade.letter', { grade })}`;
}

export function domainLetter(
  score: number | null,
  locked: boolean,
): string | null {
  if (locked) return null;
  return gradeForScore(score);
}

export function severityTone(severity: number, status: string): SeverityTone {
  if (status === 'warn') return severity >= 3 ? 'check' : 'minor';
  if (severity >= 4) return 'crit';
  if (severity >= 3) return 'fix';
  return 'minor';
}

export function severityKey(tone: SeverityTone): string {
  if (tone === 'crit') return 'hub.sev.crit';
  if (tone === 'fix') return 'hub.sev.fix';
  if (tone === 'check') return 'hub.sev.check';
  return 'hub.sev.minor';
}

/** Feuille native seulement sur un pointeur tactile, quand l’API existe. */
export function shareGesture(
  coarsePointer: boolean,
  canShare: boolean,
): ShareGesture {
  return coarsePointer && canShare ? 'native' : 'dialog';
}

export function failureKind(error: string | null): FailureKind {
  const text = (error ?? '').toLowerCase();
  if (
    text.includes('403') ||
    text.includes('refus') ||
    text.includes('denied')
  ) {
    return 'denied';
  }
  if (
    text.includes('timeout') ||
    text.includes('unreachable') ||
    text.includes('injoign') ||
    text.includes('econn')
  ) {
    return 'down';
  }
  return 'failed';
}

export function actionCounts(values: readonly ActionStatus[]): {
  todo: number;
  doing: number;
  done: number;
} {
  return {
    todo: values.filter((item) => item === 'todo').length,
    doing: values.filter((item) => item === 'doing').length,
    done: values.filter((item) => item === 'done').length,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Le serveur a déjà filtré. Si l’aperçu répond, il remplace la note,
 * les verrous et la liste des constats visibles.
 */
export function mergeApercu(
  payload: AuditPayload,
  apercu: unknown,
): AuditPayload {
  const row = asRecord(apercu);
  if (!row) return payload;
  if (typeof row.site_verifie !== 'boolean' && !Array.isArray(row.domaines)) {
    return payload;
  }
  const verified = row.site_verifie === true;
  const score = typeof row.score_global === 'number' ? row.score_global : null;
  const partial =
    typeof row.note_partielle === 'string' ? row.note_partielle : null;
  const locked = new Set<string>();
  const scores = new Map<string, number | null>();
  if (Array.isArray(row.domaines)) {
    for (const item of row.domaines) {
      const domain = asRecord(item);
      if (!domain || typeof domain.domaine !== 'string') continue;
      if (domain.verrouille === true) {
        locked.add(domain.domaine);
        continue;
      }
      scores.set(
        domain.domaine,
        typeof domain.score === 'number' ? domain.score : null,
      );
    }
  } else if (!verified) {
    for (const name of SENSITIVE) locked.add(name);
  }
  const allowed = new Set<string>();
  const hasConstats = Array.isArray(row.constats);
  if (hasConstats) {
    for (const item of row.constats as unknown[]) {
      const finding = asRecord(item);
      if (finding && typeof finding.check_id === 'string') {
        allowed.add(finding.check_id);
      }
    }
  }
  const known = new Set(payload.domains.map((item) => item.domain));
  const extras = [...locked]
    .filter((name) => !known.has(name))
    .map((name) => ({
      domain: name,
      score: null,
      coverage: 0,
      level: 'locked',
      locked: true,
    }));
  return {
    ...payload,
    audit: {
      ...payload.audit,
      siteVerified: verified,
      globalScore: verified ? score : null,
      partialLabel: partial,
    },
    domains: [
      ...payload.domains.map((item) => {
        if (locked.has(item.domain)) {
          return { ...item, score: null, locked: true };
        }
        if (scores.has(item.domain)) {
          return {
            ...item,
            score: scores.get(item.domain) ?? null,
            locked: false,
          };
        }
        if (!verified && SENSITIVE.has(item.domain)) {
          return { ...item, score: null, locked: true };
        }
        return item;
      }),
      ...extras,
    ],
    findings: payload.findings.filter((item) => {
      if (locked.has(item.domain)) return false;
      if (!verified && SENSITIVE.has(item.domain)) return false;
      if (hasConstats && !allowed.has(item.checkId)) return false;
      return true;
    }),
  };
}
