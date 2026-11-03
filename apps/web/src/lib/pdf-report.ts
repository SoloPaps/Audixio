import { formatDate } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import type { ApiDomain, ApiFinding, AuditPayload } from './audit-api.js';
import { type Grade, gradeForScore } from './grade.js';
import { asParams, translate } from './translate.js';

const ORDER = [
  'securite',
  'performance',
  'accessibilite',
  'seo',
  'vie_privee',
  'ecologie',
  'qualite',
  'dns_email',
] as const;

const SENSITIVE = new Set(['securite', 'vie_privee', 'dns_email']);

const LABEL = {
  securite: 'pdf.dom.securite',
  performance: 'pdf.dom.performance',
  accessibilite: 'pdf.dom.accessibilite',
  seo: 'pdf.dom.seo',
  vie_privee: 'pdf.dom.vie_privee',
  ecologie: 'pdf.dom.ecologie',
  qualite: 'pdf.dom.qualite',
  dns_email: 'pdf.dom.dns_email',
} as const;

export type PdfTone = 'crit' | 'fix' | 'check' | 'minor';

export interface PdfPriority {
  title: string;
  detail: string;
  tone: PdfTone;
}

export interface PdfDomainRow {
  id: (typeof ORDER)[number];
  label: string;
  grade: Grade | null;
  locked: boolean;
  note: string;
  open: number;
}

export interface PdfReport {
  host: string;
  dateLabel: string;
  dateTime: string;
  verified: boolean;
  critical: number;
  grade: Grade | null;
  priorities: PdfPriority[];
  domains: PdfDomainRow[];
}

function hostOf(payload: AuditPayload): string {
  const label = payload.audit.site.label.trim();
  if (label !== '') return label;
  try {
    return new URL(payload.audit.site.url).host;
  } catch {
    return payload.audit.site.url;
  }
}

function observed(payload: AuditPayload): Date {
  const raw = payload.audit.finishedAt ?? payload.audit.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function line(
  key: string,
  params?: Record<string, string | number> | null,
): string {
  return translate(key, params) ?? key;
}

function toneOf(row: ApiFinding): PdfTone {
  if (row.status === 'fail' && row.severity >= 4) return 'crit';
  if (row.severity >= 3) return 'fix';
  if (row.severity >= 2) return 'check';
  return 'minor';
}

function isConstat(row: ApiFinding): boolean {
  return row.checkId.endsWith('.constat');
}

function hidden(row: ApiFinding, verified: boolean): boolean {
  return !verified && SENSITIVE.has(row.domain);
}

export function buildPdfReport(payload: AuditPayload): PdfReport {
  const verified = payload.audit.siteVerified === true;
  const when = observed(payload);
  const findings = payload.findings.filter((row) => !hidden(row, verified));
  const byDomain = new Map<string, ApiDomain>();
  for (const row of payload.domains) byDomain.set(row.domain, row);
  const priorities = findings
    .filter((row) => !isConstat(row) && row.status !== 'pass')
    .sort(
      (left, right) =>
        right.severity * 10 + right.impact - (left.severity * 10 + left.impact),
    )
    .slice(0, 5)
    .map((row) => {
      const reason = row.reason ? line(row.reason) : '';
      const label = ORDER.includes(row.domain as (typeof ORDER)[number])
        ? t(LABEL[row.domain as (typeof ORDER)[number]])
        : row.domain;
      return {
        title: line(row.messageKey, asParams(row.params)),
        detail: reason === '' ? label : `${label} · ${reason}`,
        tone: toneOf(row),
      };
    });
  const domains = ORDER.map((id) => {
    const source = byDomain.get(id);
    const locked =
      (!verified && SENSITIVE.has(id)) ||
      source?.locked === true ||
      source?.score == null;
    const grade = locked ? null : gradeForScore(source?.score ?? null);
    const constat = findings.find((row) => row.domain === id && isConstat(row));
    const note =
      locked || !constat
        ? t('pdf.note.empty')
        : line(constat.messageKey, asParams(constat.params));
    const open = locked
      ? 0
      : findings.filter(
          (row) =>
            row.domain === id && row.status === 'fail' && !isConstat(row),
        ).length;
    return {
      id,
      label: t(LABEL[id]),
      grade,
      locked,
      note,
      open,
    };
  });
  return {
    host: hostOf(payload),
    dateLabel: formatDate(when),
    dateTime: when.toISOString(),
    verified,
    critical: findings.filter(
      (row) => row.status === 'fail' && row.severity >= 4 && !isConstat(row),
    ).length,
    grade: gradeForScore(payload.audit.globalScore),
    priorities,
    domains,
  };
}
