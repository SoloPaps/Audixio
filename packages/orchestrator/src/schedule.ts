import { createHash } from 'node:crypto';
import {
  createRequestBudget,
  createSafeFetch,
  isNetError,
  type SafeFetch,
} from '@audigy/net';
import { apiError } from './http.js';
import { errorCode, type Logger } from './log.js';
import {
  ALERT_KINDS,
  type AlertKind,
  type AlertPayload,
  type DigestSite,
  type Mailer,
  renderAlert,
  renderDigest,
  siteLabel,
  unsubscribeUrl,
} from './mail.js';
import { mailGrade } from './mail-templates.js';

/** Le cron Netlify coupe à 30 s. On s'arrête avant. */
export const TICK_BUDGET_MS = 25_000;
/** Brut conservé 30 jours, puis replié dans `uptime_daily`. */
export const UPTIME_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
/** Deux ticks trop rapprochés ne sondent pas deux fois. */
export const UPTIME_GAP_MS = 10 * 60_000;
const PROBE_CONCURRENCY = 50;

const WEEKDAY_FROM_MONDAY: Readonly<Record<string, number>> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export interface UptimeSample {
  ok: boolean;
  statusCode: number | null;
  ms: number;
}

export interface SiteProbe {
  request(url: string, method: 'HEAD' | 'GET'): Promise<{ status: number }>;
}

export interface RosterAudit {
  id: string;
  score: number | null;
  finishedAt: string | null;
  graves: string[];
  certDays: number | null;
  certUntil: string | null;
}

export type Cadence = 'daily' | 'weekly' | 'monthly';
export type PlanTier = 'free' | 'pro';

/** Réglages lus dans `alert_settings`, ou les défauts de `ensure_alert_settings`. */
export interface SiteAlertPrefs {
  plan: PlanTier;
  cadence: Cadence;
  sslWarnDays: number;
  /** 0 = la lettre baisse. 1 à 40 = baisse en points. */
  scoreDropPoints: number;
  alertsEnabled: boolean;
  verified: boolean;
  /** Un audit est déjà en file : on n'en crée pas un deuxième. */
  auditOpen: boolean;
  lastAuditAt: string | null;
}

export interface RosterSite {
  id: string;
  ownerId: string;
  url: string;
  label: string;
  host: string;
  emailOptOut: boolean;
  lastOk: boolean | null;
  lastCheckedAt: string | null;
  incidentId: string | null;
  audits: RosterAudit[];
  /** Absent : anciens seuils (10 points, certificat < 21 j), pour les tests déjà en place. */
  prefs?: SiteAlertPrefs;
}

export interface DueSchedule {
  siteId: string;
  ownerId: string;
  cadence: Cadence;
  mode: 'passive' | 'active';
  nextRunAt: string;
}

export interface Roster {
  sites: RosterSite[];
  due: DueSchedule[];
}

export interface RawCheck {
  id: string;
  siteId: string;
  checkedAt: string;
  ok: boolean;
  ms: number | null;
}

export interface DailyFold {
  siteId: string;
  day: string;
  checks: number;
  failures: number;
  p50Ms: number | null;
}

export interface PendingAlert {
  id: string;
  userId: string;
  siteId: string;
  kind: AlertKind;
  payload: AlertPayload;
  emailOptOut: boolean;
}

export interface ScheduleStore {
  roster(now: Date): Promise<Roster>;
  insertCheck(input: {
    siteId: string;
    checkedAt: string;
    ok: boolean;
    statusCode: number | null;
    ms: number;
  }): Promise<void>;
  openIncident(siteId: string, at: string): Promise<string | null>;
  resolveIncident(id: string, at: string): Promise<void>;
  findAlert(
    userId: string,
    siteId: string,
    kind: AlertKind,
    dedup: string,
  ): Promise<boolean>;
  insertAlert(input: {
    userId: string;
    siteId: string;
    kind: AlertKind;
    payload: AlertPayload;
  }): Promise<{ status: 'created'; id: string } | { status: 'duplicate' }>;
  markAlertSent(id: string, at: string): Promise<void>;
  pendingAlerts(): Promise<PendingAlert[]>;
  advanceSchedule(siteId: string, now: Date, next: string): Promise<boolean>;
  enqueue(input: {
    userId: string;
    siteId: string;
    mode: 'passive' | 'active';
  }): Promise<'created' | 'existing' | 'skip'>;
  rollup(now: Date): Promise<{ days: number; purged: number }>;
  userEmail(userId: string): Promise<string | null>;
}

export interface DigestRecipient {
  userId: string;
  sites: DigestSite[];
}

export interface DigestStore {
  recipients(now: Date): Promise<DigestRecipient[]>;
  claim(userId: string, week: string, windowStart: string): Promise<boolean>;
  release(userId: string, week: string, windowStart: string): Promise<void>;
  userEmail(userId: string): Promise<string | null>;
}

export interface ScheduleDeps {
  now(): Date;
  budgetMs?: number;
  store: ScheduleStore;
  probe(url: string): Promise<UptimeSample>;
  mailer: Mailer | null;
  appBaseUrl: string | null;
  signingKey: string;
  logger: Logger;
  trigger(): Promise<void>;
}

export interface DigestDeps {
  now(): Date;
  store: DigestStore;
  mailer: Mailer | null;
  appBaseUrl: string | null;
  signingKey: string;
  logger: Logger;
}

export interface TickResult {
  probed: number;
  blocked: number;
  enqueued: number;
  alerts: number;
  purged: number;
}

export function parisDay(instant: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant instanceof Date ? instant : new Date(instant));
}

interface ParisParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: string;
}

function parisParts(now: Date): ParisParts {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    weekday: bag.weekday ?? '',
  };
}

/** Lundi entre 8 h et 9 h, heure de Paris (hiver et été). */
export function isMondayEightParis(now: Date): boolean {
  const parts = parisParts(now);
  return parts.weekday === 'Mon' && parts.hour === 8;
}

export function parisWeek(now: Date): { week: string; windowStart: string } {
  const parts = parisParts(now);
  const delta = WEEKDAY_FROM_MONDAY[parts.weekday] ?? 0;
  const week = shiftDays(parts.year, parts.month, parts.day, delta);
  return { week, windowStart: `${week}T00:00:00.000Z` };
}

function shiftDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): string {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - delta);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nextRunAt(cadence: Cadence, now: Date): string {
  const next = new Date(now.getTime());
  if (cadence === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

const GRADE_RANK: Readonly<Record<string, number>> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
};

export function parseCadence(value: string): Cadence {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') {
    return value;
  }
  return 'monthly';
}

function clampNum(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isInteger(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

/** Mêmes défauts que `ensure_alert_settings` : gratuit mensuel, Pro hebdo, certificat 14 j. */
export function defaultsForPlan(plan: PlanTier): SiteAlertPrefs {
  return {
    plan,
    cadence: plan === 'pro' ? 'weekly' : 'monthly',
    sslWarnDays: 14,
    scoreDropPoints: 0,
    alertsEnabled: true,
    verified: false,
    auditOpen: false,
    lastAuditAt: null,
  };
}

/** Le gratuit reste figé. Le Pro garde daily / weekly / monthly, 1–90 j, 0–40 pts. */
export function clampAlertPrefs(prefs: SiteAlertPrefs): SiteAlertPrefs {
  if (prefs.plan === 'pro') {
    return {
      ...prefs,
      cadence: parseCadence(prefs.cadence),
      sslWarnDays: clampNum(prefs.sslWarnDays, 1, 90, 14),
      scoreDropPoints: clampNum(prefs.scoreDropPoints, 0, 40, 0),
    };
  }
  return {
    ...prefs,
    plan: 'free',
    cadence: 'monthly',
    sslWarnDays: 14,
    scoreDropPoints: 0,
  };
}

export function reauditDue(prefs: SiteAlertPrefs, now: Date): boolean {
  const rules = clampAlertPrefs(prefs);
  if (!rules.verified || rules.auditOpen) return false;
  if (!rules.lastAuditAt) return true;
  const last = Date.parse(rules.lastAuditAt);
  if (Number.isNaN(last)) return true;
  return now.getTime() >= Date.parse(nextRunAt(rules.cadence, new Date(last)));
}

/** 0 point = la lettre baisse (B vers C). Sinon, baisse d'au moins N points. */
export function scoreDropped(
  before: number,
  after: number,
  points: number,
): boolean {
  if (!Number.isFinite(before) || !Number.isFinite(after) || after >= before) {
    return false;
  }
  if (points <= 0) {
    const from = mailGrade(before);
    const to = mailGrade(after);
    if (!from || !to) return false;
    return (GRADE_RANK[to] ?? 0) > (GRADE_RANK[from] ?? 0);
  }
  return before - after >= points;
}

export function findingDelta(
  previous: readonly string[],
  latest: readonly string[],
): { fresh: string[]; fixed: string[] } {
  const before = new Set(previous);
  const after = new Set(latest);
  return {
    fresh: [...after].filter((id) => !before.has(id)),
    fixed: [...before].filter((id) => !after.has(id)),
  };
}

export interface DigestAuditFact {
  siteId: string;
  score: number | null;
  finishedAt: string | null;
  failed: readonly string[];
  graves: number;
  certDays: number | null;
}

export interface DigestFacts {
  now: Date;
  users: readonly {
    id: string;
    weeklyDigest: boolean;
    emailOptOut: boolean;
  }[];
  sites: readonly {
    id: string;
    ownerId: string;
    label: string;
    host: string;
    verified: boolean;
  }[];
  audits: readonly DigestAuditFact[];
  uptime: readonly {
    siteId: string;
    day: string;
    checks: number;
    failures: number;
  }[];
  openIncidents: readonly string[];
  sslWarnDays: readonly { siteId: string; days: number }[];
}

/** Récap du lundi : sites vérifiés, semaine de Paris, un envoi par personne plus loin. */
export function assembleDigest(facts: DigestFacts): DigestRecipient[] {
  const week = parisWeek(facts.now).week;
  const open = new Set(facts.openIncidents);
  const warn = new Map(facts.sslWarnDays.map((row) => [row.siteId, row.days]));
  const people: DigestRecipient[] = [];
  for (const user of facts.users) {
    if (!user.weeklyDigest || user.emailOptOut) continue;
    const owned = facts.sites
      .filter((site) => site.ownerId === user.id && site.verified)
      .slice()
      .sort((a, b) => a.host.localeCompare(b.host, 'fr'));
    if (owned.length === 0) continue;
    const sites: DigestSite[] = owned.map((site) => {
      const audits = facts.audits
        .filter((audit) => audit.siteId === site.id)
        .slice()
        .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
      const latest = audits[0];
      const previous = audits[1];
      const baseline =
        audits.find(
          (audit) =>
            audit !== latest &&
            audit.finishedAt !== null &&
            parisDay(audit.finishedAt) < week,
        ) ?? previous;
      const delta = previous
        ? findingDelta(previous.failed, latest?.failed ?? [])
        : { fresh: [], fixed: [] };
      let checks = 0;
      let failures = 0;
      for (const day of facts.uptime) {
        if (day.siteId !== site.id || day.day < week) continue;
        checks += day.checks;
        failures += day.failures;
      }
      const card: DigestSite = {
        label: site.label,
        host: site.host,
        score: latest?.score ?? null,
        checks,
        failures,
        openIncident: open.has(site.id),
        newFindings: delta.fresh.length,
        fixedFindings: delta.fixed.length,
        openProblems: latest?.graves ?? 0,
        certDays: latest?.certDays ?? null,
        sslWarnDays: warn.get(site.id) ?? 14,
      };
      if (baseline?.score !== null && baseline?.score !== undefined) {
        card.previousScore = baseline.score;
      }
      return card;
    });
    people.push({ userId: user.id, sites });
  }
  return people;
}

export interface AlertSettingRow {
  siteId: string;
  userId: string;
  cadence: string;
  sslWarnDays: number;
  scoreDropPoints: number;
  alertsEnabled: boolean;
}

export interface AlertRosterInput {
  plans: readonly { userId: string; plan: string }[];
  settings: readonly AlertSettingRow[];
  verifiedSiteIds: readonly string[];
  openSiteIds: readonly string[];
}

function latestFinished(site: RosterSite): string | null {
  const dates = site.audits
    .map((audit) => audit.finishedAt)
    .filter((value): value is string => Boolean(value))
    .slice()
    .sort();
  return dates.at(-1) ?? null;
}

function asPlan(value: string | undefined): PlanTier {
  return value === 'pro' ? 'pro' : 'free';
}

/**
 * Pose les prefs de chaque site. Sans ligne `alert_settings`, mêmes défauts
 * que `ensure_alert_settings` (le cron n'a pas de `auth.uid()` pour l'appeler).
 * L'échéance vient de ces prefs, plus de la table `schedules`.
 */
export function applyAlertSettings(
  roster: Roster,
  input: AlertRosterInput,
  now: Date,
): Roster {
  const plans = new Map(input.plans.map((row) => [row.userId, row.plan]));
  const settings = new Map(
    input.settings.map((row) => [`${row.userId}:${row.siteId}`, row]),
  );
  const verified = new Set(input.verifiedSiteIds);
  const open = new Set(input.openSiteIds);
  const sites = roster.sites.map((site) => {
    const plan = asPlan(plans.get(site.ownerId));
    const row = settings.get(`${site.ownerId}:${site.id}`);
    const base = defaultsForPlan(plan);
    const prefs = clampAlertPrefs({
      ...base,
      verified: verified.has(site.id),
      auditOpen: open.has(site.id),
      lastAuditAt: latestFinished(site),
      ...(row
        ? {
            cadence: parseCadence(row.cadence),
            sslWarnDays: row.sslWarnDays,
            scoreDropPoints: row.scoreDropPoints,
            alertsEnabled: row.alertsEnabled,
          }
        : {}),
    });
    prefs.verified = verified.has(site.id);
    prefs.auditOpen = open.has(site.id);
    prefs.lastAuditAt = latestFinished(site);
    return { ...site, prefs };
  });
  return { sites, due: dueAudits({ sites, due: [] }, now) };
}

/** Échéances `alert_settings`. Sans prefs, on garde la file `schedules`. */
export function dueAudits(roster: Roster, now: Date): DueSchedule[] {
  const managed = new Set(
    roster.sites.filter((site) => site.prefs).map((site) => site.id),
  );
  const legacy = roster.due.filter((item) => !managed.has(item.siteId));
  const fresh: DueSchedule[] = [];
  for (const site of roster.sites) {
    if (!site.prefs || !reauditDue(site.prefs, now)) continue;
    const rules = clampAlertPrefs(site.prefs);
    fresh.push({
      siteId: site.id,
      ownerId: site.ownerId,
      cadence: rules.cadence,
      mode: 'passive',
      nextRunAt: now.toISOString(),
    });
  }
  return [...legacy, ...fresh];
}

export function digestRateKey(userId: string, week: string): string {
  return createHash('sha256')
    .update(`audigy:digest:${userId}:${week}`)
    .digest('hex');
}

export function checksToPurge(
  rows: readonly RawCheck[],
  now: Date,
): RawCheck[] {
  const cutoff = now.getTime() - UPTIME_KEEP_MS;
  return rows.filter((row) => Date.parse(row.checkedAt) < cutoff);
}

export function median(values: readonly number[]): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value) && value >= 0)
    .slice()
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1] ?? 0;
  const right = sorted[mid] ?? 0;
  return Math.round((left + right) / 2);
}

/** Replie des mesures brutes par site et jour de Paris. */
export function foldUptime(rows: readonly RawCheck[]): DailyFold[] {
  const groups = new Map<string, RawCheck[]>();
  for (const row of rows) {
    const day = parisDay(row.checkedAt);
    const key = `${row.siteId}:${day}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const split = key.indexOf(':');
    const siteId = key.slice(0, split);
    const day = key.slice(split + 1);
    return {
      siteId,
      day,
      checks: list.length,
      failures: list.filter((row) => !row.ok).length,
      p50Ms: median(list.flatMap((row) => (row.ms === null ? [] : [row.ms]))),
    };
  });
}

export function mergeDaily(
  existing: Pick<DailyFold, 'checks' | 'failures' | 'p50Ms'> | null,
  batch: DailyFold,
): DailyFold {
  if (!existing) return batch;
  return {
    siteId: batch.siteId,
    day: batch.day,
    checks: existing.checks + batch.checks,
    failures: existing.failures + batch.failures,
    p50Ms: blend(existing.p50Ms, existing.checks, batch.p50Ms, batch.checks),
  };
}

function blend(
  left: number | null,
  leftCount: number,
  right: number | null,
  rightCount: number,
): number | null {
  if (left === null) return right;
  if (right === null) return left;
  const total = leftCount + rightCount;
  if (total <= 0) return right;
  return Math.round((left * leftCount + right * rightCount) / total);
}

/** HEAD, repli GET si la méthode est refusée. Un blocage SSRF est relancé. */
export async function readUptime(
  probe: SiteProbe,
  url: string,
  clock: () => number = Date.now,
): Promise<UptimeSample> {
  const start = clock();
  try {
    let status = (await probe.request(url, 'HEAD')).status;
    if (status === 405 || status === 501) {
      status = (await probe.request(url, 'GET')).status;
    }
    return {
      ok: status >= 200 && status < 500,
      statusCode: status,
      ms: Math.max(0, clock() - start),
    };
  } catch (error) {
    if (isNetError(error) && error.code.startsWith('BLOCKED_')) throw error;
    return {
      ok: false,
      statusCode: null,
      ms: Math.max(0, clock() - start),
    };
  }
}

export function siteProbeFromSafeFetch(safeFetch: SafeFetch): SiteProbe {
  return {
    async request(url, method) {
      try {
        const res = await safeFetch(url, { method, accept: 'text/html' });
        return { status: res.status };
      } catch (error) {
        if (
          isNetError(error) &&
          error.code === 'RESPONSE_TOO_LARGE' &&
          method === 'GET'
        ) {
          return { status: 200 };
        }
        throw error;
      }
    },
  };
}

export function createUptimeProbe(botUrl: string | undefined): {
  check(url: string): Promise<UptimeSample>;
} {
  const safeFetch = createSafeFetch({
    ...(botUrl ? { botUrl } : {}),
    timeoutMs: 8_000,
    maxHtmlBytes: 32 * 1024,
    budget: createRequestBudget({ maxRequests: 200 }),
  });
  const probe = siteProbeFromSafeFetch(safeFetch);
  return { check: (url) => readUptime(probe, url) };
}

function canMail(deps: {
  mailer: Mailer | null;
  appBaseUrl: string | null;
  signingKey: string;
}): deps is {
  mailer: Mailer;
  appBaseUrl: string;
  signingKey: string;
} {
  return Boolean(
    deps.mailer && deps.appBaseUrl && deps.signingKey.length >= 16,
  );
}

function isRecent(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return false;
  return now.getTime() - then < UPTIME_GAP_MS;
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const width = Math.min(Math.max(1, limit), items.length);
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item === undefined) return;
        out[index] = await run(item, index);
      }
    }),
  );
  return out;
}

interface PlannedAlert {
  kind: AlertKind;
  payload: AlertPayload;
}

function acceptsAlerts(site: RosterSite): boolean {
  if (!site.prefs) return true;
  const rules = clampAlertPrefs(site.prefs);
  return rules.verified && rules.alertsEnabled;
}

function plannedAudits(site: RosterSite): PlannedAlert[] {
  if (!acceptsAlerts(site)) return [];
  const rules = site.prefs ? clampAlertPrefs(site.prefs) : null;
  const audits = site.audits.slice().sort((a, b) => {
    return (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '');
  });
  const latest = audits[0];
  const previous = audits[1];
  const planned: PlannedAlert[] = [];
  const name = siteLabel(site.label, site.host);
  const points = rules ? rules.scoreDropPoints : 10;
  if (
    latest &&
    previous &&
    latest.score !== null &&
    previous.score !== null &&
    (rules
      ? scoreDropped(previous.score, latest.score, points)
      : previous.score - latest.score >= 10)
  ) {
    planned.push({
      kind: 'score_drop',
      payload: {
        dedup: `score:${previous.id}:${latest.id}`,
        site: name,
        before: previous.score,
        after: latest.score,
      },
    });
  }
  if (latest && previous) {
    const seen = new Set(previous.graves);
    const fresh = latest.graves.filter((checkId) => !seen.has(checkId));
    if (fresh.length > 0) {
      planned.push({
        kind: 'grave_problem',
        payload: {
          dedup: `grave:${latest.id}`,
          site: name,
          count: fresh.length,
        },
      });
    }
  }
  const certHit =
    latest?.certDays !== null &&
    latest?.certDays !== undefined &&
    (rules ? latest.certDays <= rules.sslWarnDays : latest.certDays < 21);
  if (latest && certHit && latest.certDays !== null) {
    planned.push({
      kind: 'cert_expiring',
      payload: {
        dedup: `cert:${latest.certUntil ?? 'open'}`,
        site: name,
        days: latest.certDays,
      },
    });
  }
  return planned;
}

async function raise(
  store: ScheduleStore,
  site: RosterSite,
  planned: PlannedAlert,
  at: string,
): Promise<number> {
  if (!acceptsAlerts(site)) return 0;
  const known = await store.findAlert(
    site.ownerId,
    site.id,
    planned.kind,
    planned.payload.dedup,
  );
  if (known) return 0;
  const payload = site.emailOptOut
    ? { ...planned.payload, suppressed: true }
    : planned.payload;
  const inserted = await store.insertAlert({
    userId: site.ownerId,
    siteId: site.id,
    kind: planned.kind,
    payload,
  });
  if (inserted.status === 'duplicate') return 0;
  if (site.emailOptOut) await store.markAlertSent(inserted.id, at);
  return 1;
}

async function sendPending(
  deps: ScheduleDeps,
  now: Date,
  expired: () => boolean,
): Promise<void> {
  const pending = await deps.store.pendingAlerts();
  if (!canMail(deps)) {
    if (pending.length > 0) deps.logger.warn('mail_unconfigured', {});
    return;
  }
  const emails = new Map<string, string | null>();
  for (const alert of pending) {
    if (expired()) return;
    if (!ALERT_KINDS.includes(alert.kind)) continue;
    if (alert.emailOptOut || alert.payload.suppressed) {
      await deps.store.markAlertSent(alert.id, now.toISOString());
      continue;
    }
    let email = emails.get(alert.userId);
    if (email === undefined) {
      email = await deps.store.userEmail(alert.userId);
      emails.set(alert.userId, email);
    }
    if (!email) continue;
    const link = unsubscribeUrl(deps.appBaseUrl, deps.signingKey, alert.userId);
    const body = renderAlert({
      kind: alert.kind,
      payload: alert.payload,
      appUrl: deps.appBaseUrl,
      unsubscribeUrl: link,
    });
    if (!body) {
      deps.logger.warn('alert_invalid', { kind: alert.kind });
      await deps.store.markAlertSent(alert.id, now.toISOString());
      continue;
    }
    try {
      await deps.mailer.send({ ...body, to: email, unsubscribeUrl: link });
      await deps.store.markAlertSent(alert.id, now.toISOString());
    } catch (error) {
      deps.logger.warn('mail_failed', { code: errorCode(error) });
    }
  }
}

/** Uptime, alertes, file d'audits, agrégation. Borné pour tenir en 30 s. */
export async function runScheduleTick(deps: ScheduleDeps): Promise<TickResult> {
  const now = deps.now();
  const started = Date.now();
  const budget = deps.budgetMs ?? TICK_BUDGET_MS;
  const expired = () => Date.now() - started >= budget;
  const roster = await deps.store.roster(now);
  let enqueued = 0;
  let wake = false;

  for (const due of dueAudits(roster, now)) {
    const outcome = await deps.store.enqueue({
      userId: due.ownerId,
      siteId: due.siteId,
      mode: due.mode,
    });
    if (outcome === 'skip') continue;
    const advanced = await deps.store.advanceSchedule(
      due.siteId,
      now,
      nextRunAt(due.cadence, now),
    );
    if (outcome === 'created') enqueued += 1;
    if (outcome === 'created' || advanced) wake = true;
  }

  let alerts = 0;
  for (const site of roster.sites) {
    for (const planned of plannedAudits(site)) {
      alerts += await raise(deps.store, site, planned, now.toISOString());
    }
  }

  let probed = 0;
  let blocked = 0;
  const samples = await mapPool(
    roster.sites,
    PROBE_CONCURRENCY,
    async (site) => {
      if (site.prefs && !clampAlertPrefs(site.prefs).verified) return null;
      if (expired() || isRecent(site.lastCheckedAt, now)) return null;
      try {
        const sample = await deps.probe(site.url);
        probed += 1;
        return sample;
      } catch (error) {
        if (isNetError(error) && error.code.startsWith('BLOCKED_')) {
          blocked += 1;
          return null;
        }
        probed += 1;
        return { ok: false, statusCode: null, ms: 0 };
      }
    },
  );

  for (let index = 0; index < roster.sites.length; index += 1) {
    const site = roster.sites[index];
    const sample = samples[index];
    if (!site || !sample) continue;
    await deps.store.insertCheck({
      siteId: site.id,
      checkedAt: now.toISOString(),
      ok: sample.ok,
      statusCode: sample.statusCode,
      ms: sample.ms,
    });
    const name = siteLabel(site.label, site.host);
    if (!sample.ok) {
      if (site.lastOk !== false || site.incidentId) continue;
      const incidentId = await deps.store.openIncident(
        site.id,
        now.toISOString(),
      );
      if (!incidentId) continue;
      alerts += await raise(
        deps.store,
        site,
        {
          kind: 'site_down',
          payload: { dedup: `down:${incidentId}`, site: name },
        },
        now.toISOString(),
      );
      continue;
    }
    if (!site.incidentId) continue;
    await deps.store.resolveIncident(site.incidentId, now.toISOString());
    alerts += await raise(
      deps.store,
      site,
      {
        kind: 'site_recovered',
        payload: { dedup: `up:${site.incidentId}`, site: name },
      },
      now.toISOString(),
    );
  }

  const rolled = await deps.store.rollup(now);
  await sendPending(deps, now, expired);
  if (wake) {
    try {
      await deps.trigger();
    } catch (error) {
      deps.logger.warn('audit_trigger_failed', { code: errorCode(error) });
    }
  }
  const result = {
    probed,
    blocked,
    enqueued,
    alerts,
    purged: rolled.purged,
  };
  deps.logger.info('schedule_tick', result);
  return result;
}

export async function handleSchedule(
  req: Request,
  deps: ScheduleDeps,
): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'method_not_allowed');
  const result = await runScheduleTick(deps);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** Résumé du lundi. L'idempotence est le claim de la semaine. */
export async function runWeeklyDigest(
  deps: DigestDeps,
): Promise<{ sent: number }> {
  if (!canMail(deps)) {
    deps.logger.warn('mail_unconfigured', {});
    return { sent: 0 };
  }
  const now = deps.now();
  const { week, windowStart } = parisWeek(now);
  const people = await deps.store.recipients(now);
  let sent = 0;
  for (const person of people) {
    if (person.sites.length === 0) continue;
    const claimed = await deps.store.claim(person.userId, week, windowStart);
    if (!claimed) continue;
    const email = await deps.store.userEmail(person.userId);
    if (!email) {
      await deps.store.release(person.userId, week, windowStart);
      continue;
    }
    const link = unsubscribeUrl(
      deps.appBaseUrl,
      deps.signingKey,
      person.userId,
    );
    const body = renderDigest({
      sites: person.sites,
      appUrl: deps.appBaseUrl,
      unsubscribeUrl: link,
    });
    try {
      await deps.mailer.send({ ...body, to: email, unsubscribeUrl: link });
      sent += 1;
    } catch (error) {
      await deps.store.release(person.userId, week, windowStart);
      deps.logger.warn('mail_failed', { code: errorCode(error) });
    }
  }
  deps.logger.info('digest_weekly', { sent });
  return { sent };
}

export async function handleDigest(
  req: Request,
  deps: DigestDeps,
): Promise<Response> {
  if (req.method !== 'POST') return apiError(405, 'method_not_allowed');
  const force = new URL(req.url).searchParams.get('run') === '1';
  if (!force && !isMondayEightParis(deps.now())) {
    return new Response(null, { status: 204 });
  }
  const result = await runWeeklyDigest(deps);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
