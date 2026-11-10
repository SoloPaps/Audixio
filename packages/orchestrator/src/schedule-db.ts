import {
  createServiceClient,
  type Database,
  dbEnvFrom,
  requestAudit,
} from '@audigy/db';
import { ENGINE_VERSION, METHOD_VERSION } from '@audigy/engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { auditEndEmailFns } from './audit-end-db.js';
import { mailLocaleOf } from './copy.js';
import type { Logger } from './log.js';
import {
  ALERT_KINDS,
  createBrevoMailer,
  type Mailer,
  parseAlertPayload,
  senderEmail,
  type UnsubscribeDeps,
} from './mail.js';
import {
  type AlertRosterInput,
  applyAlertSettings,
  assembleDigest,
  checksToPurge,
  clampAlertPrefs,
  createUptimeProbe,
  type DailyFold,
  type DigestAuditFact,
  type DigestDeps,
  type DigestFacts,
  type DigestRecipient,
  type DigestStore,
  defaultsForPlan,
  digestRateKey,
  foldUptime,
  mergeDaily,
  type PendingAlert,
  parisWeek,
  type RawCheck,
  type Roster,
  type ScheduleDeps,
  type ScheduleStore,
  UPTIME_KEEP_MS,
} from './schedule.js';
import { selfOrigin } from './supabase.js';
import { createTrigger } from './trigger.js';

type Client = SupabaseClient<Database>;

const auditSchema = z.strictObject({
  id: z.uuid(),
  score: z.number().int().nullable(),
  finishedAt: z.string().nullable(),
  graves: z.array(z.string().max(120)),
  certDays: z.number().int().nullable(),
  certUntil: z.string().max(80).nullable(),
});

const siteSchema = z.strictObject({
  id: z.uuid(),
  ownerId: z.uuid(),
  url: z.string().min(1).max(2048),
  label: z.string().max(200),
  host: z.string().min(1).max(253),
  emailOptOut: z.boolean(),
  lastOk: z.boolean().nullable(),
  lastCheckedAt: z.string().nullable(),
  incidentId: z.uuid().nullable(),
  audits: z.array(auditSchema),
});

const dueSchema = z.strictObject({
  siteId: z.uuid(),
  ownerId: z.uuid(),
  cadence: z.enum(['daily', 'weekly', 'monthly']),
  mode: z.enum(['passive', 'active']),
  nextRunAt: z.string(),
});

const rosterSchema = z.strictObject({
  sites: z.array(siteSchema),
  due: z.array(dueSchema),
});

const digestSiteSchema = z.strictObject({
  label: z.string(),
  host: z.string(),
  score: z.number().int().nullable(),
  checks: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  openIncident: z.boolean(),
});

const digestSchema = z.array(
  z.strictObject({
    userId: z.uuid(),
    sites: z.array(digestSiteSchema),
  }),
);

export function parseRoster(input: unknown): Roster {
  const parsed = rosterSchema.safeParse(input);
  if (!parsed.success) throw new Error('schedule_roster_invalid');
  return parsed.data;
}

export function parseDigest(input: unknown): DigestRecipient[] {
  const parsed = digestSchema.safeParse(input);
  if (!parsed.success) throw new Error('digest_roster_invalid');
  return parsed.data;
}

function duplicate(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

function fail(error: { message: string } | null, code: string): void {
  if (error) throw new Error(code);
}

const ROLLUP_BATCH = 500;
const IN_CHUNK = 80;

async function inChunks<T>(
  ids: readonly string[],
  run: (slice: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let index = 0; index < ids.length; index += IN_CHUNK) {
    out.push(...(await run(ids.slice(index, index + IN_CHUNK))));
  }
  return out;
}

function certDaysOf(measured: unknown): number | null {
  if (!measured || typeof measured !== 'object') return null;
  const raw = (measured as { daysRemaining?: unknown }).daysRemaining;
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

async function readAlertRoster(
  service: Client,
  roster: Roster,
): Promise<AlertRosterInput> {
  const siteIds = roster.sites.map((site) => site.id);
  const userIds = [...new Set(roster.sites.map((site) => site.ownerId))];
  const [settings, plans, verified, open] = await Promise.all([
    inChunks(siteIds, async (slice) => {
      const { data, error } = await service
        .from('alert_settings')
        .select(
          'site_id, user_id, reaudit_cadence, ssl_warn_days, score_drop_points, alerts_enabled',
        )
        .in('site_id', slice);
      fail(error, 'alert_settings_failed');
      return data ?? [];
    }),
    inChunks(userIds, async (slice) => {
      const { data, error } = await service
        .from('profiles')
        .select('id, plan')
        .in('id', slice);
      fail(error, 'profile_lookup_failed');
      return data ?? [];
    }),
    inChunks(siteIds, async (slice) => {
      const { data, error } = await service
        .from('site_verifications')
        .select('site_id')
        .in('site_id', slice)
        .eq('status', 'verified');
      fail(error, 'schedule_roster_failed');
      return data ?? [];
    }),
    inChunks(siteIds, async (slice) => {
      const { data, error } = await service
        .from('audits')
        .select('site_id')
        .in('site_id', slice)
        .in('status', ['queued', 'running', 'partial']);
      fail(error, 'schedule_roster_failed');
      return data ?? [];
    }),
  ]);
  return {
    plans: plans.map((row) => ({ userId: row.id, plan: row.plan })),
    settings: settings.map((row) => ({
      siteId: row.site_id,
      userId: row.user_id,
      cadence: row.reaudit_cadence,
      sslWarnDays: row.ssl_warn_days,
      scoreDropPoints: row.score_drop_points,
      alertsEnabled: row.alerts_enabled,
    })),
    verifiedSiteIds: [...new Set(verified.map((row) => row.site_id))],
    openSiteIds: [...new Set(open.map((row) => row.site_id))],
  };
}

async function loadAuditFacts(
  service: Client,
  siteIds: readonly string[],
): Promise<DigestAuditFact[]> {
  const pairs: {
    id: string;
    site_id: string;
    global_score: number | null;
    finished_at: string | null;
  }[] = [];
  let cursor = 0;
  const width = Math.min(8, siteIds.length);
  if (width > 0) {
    await Promise.all(
      Array.from({ length: width }, async () => {
        while (cursor < siteIds.length) {
          const siteId = siteIds[cursor];
          cursor += 1;
          if (!siteId) return;
          const { data, error } = await service
            .from('audits')
            .select('id, site_id, global_score, finished_at')
            .eq('site_id', siteId)
            .eq('status', 'done')
            .order('finished_at', { ascending: false })
            .limit(2);
          fail(error, 'digest_roster_failed');
          pairs.push(...(data ?? []));
        }
      }),
    );
  }
  const ids = pairs.map((row) => row.id);
  const findings =
    ids.length === 0
      ? []
      : await inChunks(ids, async (slice) => {
          const { data, error } = await service
            .from('findings')
            .select('audit_id, check_id, severity, measured')
            .in('audit_id', slice)
            .eq('status', 'fail');
          fail(error, 'digest_roster_failed');
          return data ?? [];
        });
  return pairs.map((audit) => {
    const rows = findings.filter((row) => row.audit_id === audit.id);
    const cert = rows.find((row) => row.check_id === 'securite.certificate');
    return {
      siteId: audit.site_id,
      score: audit.global_score,
      finishedAt: audit.finished_at,
      failed: [...new Set(rows.map((row) => row.check_id))],
      graves: rows.filter((row) => row.severity === 4).length,
      certDays: certDaysOf(cert?.measured),
    };
  });
}

async function readDigestFacts(
  service: Client,
  now: Date,
): Promise<DigestFacts> {
  const empty: DigestFacts = {
    now,
    users: [],
    sites: [],
    audits: [],
    uptime: [],
    openIncidents: [],
    sslWarnDays: [],
  };
  const { data: profiles, error } = await service
    .from('profiles')
    .select('id, weekly_digest, email_opt_out, plan, locale')
    .eq('weekly_digest', true)
    .eq('email_opt_out', false);
  fail(error, 'digest_roster_failed');
  const people = profiles ?? [];
  if (people.length === 0) return empty;
  const siteRows = await inChunks(
    people.map((row) => row.id),
    async (slice) => {
      const { data, error: siteError } = await service
        .from('sites')
        .select('id, owner_id, label, host')
        .in('owner_id', slice)
        .is('deleted_at', null);
      fail(siteError, 'digest_roster_failed');
      return data ?? [];
    },
  );
  const siteIds = siteRows.map((row) => row.id);
  if (siteIds.length === 0) {
    return {
      ...empty,
      users: people.map((row) => ({
        id: row.id,
        weeklyDigest: row.weekly_digest,
        emailOptOut: row.email_opt_out,
        locale: row.locale,
      })),
    };
  }
  const [verifiedRows, settingRows, uptimeRows, incidentRows] =
    await Promise.all([
      inChunks(siteIds, async (slice) => {
        const { data, error: verifError } = await service
          .from('site_verifications')
          .select('site_id')
          .in('site_id', slice)
          .eq('status', 'verified');
        fail(verifError, 'digest_roster_failed');
        return data ?? [];
      }),
      inChunks(siteIds, async (slice) => {
        const { data, error: settingError } = await service
          .from('alert_settings')
          .select('site_id, user_id, ssl_warn_days')
          .in('site_id', slice);
        fail(settingError, 'alert_settings_failed');
        return data ?? [];
      }),
      inChunks(siteIds, async (slice) => {
        const { data, error: uptimeError } = await service
          .from('uptime_daily')
          .select('site_id, day, checks, failures')
          .in('site_id', slice)
          .gte('day', parisWeek(now).week);
        fail(uptimeError, 'digest_roster_failed');
        return data ?? [];
      }),
      inChunks(siteIds, async (slice) => {
        const { data, error: incidentError } = await service
          .from('incidents')
          .select('site_id')
          .in('site_id', slice)
          .is('resolved_at', null);
        fail(incidentError, 'digest_roster_failed');
        return data ?? [];
      }),
    ]);
  const verified = new Set(verifiedRows.map((row) => row.site_id));
  const plans = new Map(people.map((row) => [row.id, row.plan]));
  const audits = await loadAuditFacts(service, [...verified]);
  return {
    now,
    users: people.map((row) => ({
      id: row.id,
      weeklyDigest: row.weekly_digest,
      emailOptOut: row.email_opt_out,
      locale: row.locale,
    })),
    sites: siteRows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      label: row.label,
      host: row.host,
      verified: verified.has(row.id),
    })),
    audits,
    uptime: uptimeRows.map((row) => ({
      siteId: row.site_id,
      day: row.day,
      checks: row.checks,
      failures: row.failures,
    })),
    openIncidents: [...new Set(incidentRows.map((row) => row.site_id))],
    sslWarnDays: siteRows.map((site) => {
      const row = settingRows.find(
        (item) => item.site_id === site.id && item.user_id === site.owner_id,
      );
      const plan = plans.get(site.owner_id) === 'pro' ? 'pro' : 'free';
      const prefs = clampAlertPrefs({
        ...defaultsForPlan(plan),
        verified: true,
        ...(row ? { sslWarnDays: row.ssl_warn_days } : {}),
      });
      return { siteId: site.id, days: prefs.sslWarnDays };
    }),
  };
}

async function writeDaily(service: Client, batch: DailyFold): Promise<void> {
  const { data, error } = await service
    .from('uptime_daily')
    .select('checks, failures, p50_ms')
    .eq('site_id', batch.siteId)
    .eq('day', batch.day)
    .maybeSingle();
  fail(error, 'uptime_daily_failed');
  const merged = mergeDaily(
    data
      ? {
          checks: data.checks,
          failures: data.failures,
          p50Ms: data.p50_ms,
        }
      : null,
    batch,
  );
  const saved = await service.from('uptime_daily').upsert({
    site_id: merged.siteId,
    day: merged.day,
    checks: merged.checks,
    failures: merged.failures,
    p50_ms: merged.p50Ms,
  });
  fail(saved.error, 'uptime_daily_failed');
}

export function supabaseScheduleStore(service: Client): ScheduleStore {
  return {
    async roster(now) {
      const { data, error } = await service.rpc('schedule_roster', {
        p_now: now.toISOString(),
      });
      fail(error, 'schedule_roster_failed');
      const base = parseRoster(data);
      if (base.sites.length === 0) {
        return applyAlertSettings(
          base,
          { plans: [], settings: [], verifiedSiteIds: [], openSiteIds: [] },
          now,
        );
      }
      return applyAlertSettings(
        base,
        await readAlertRoster(service, base),
        now,
      );
    },

    async insertCheck(input) {
      const { error } = await service.from('uptime_checks').insert({
        site_id: input.siteId,
        checked_at: input.checkedAt,
        ok: input.ok,
        status_code: input.statusCode,
        ms: input.ms,
      });
      fail(error, 'uptime_insert_failed');
    },

    async openIncident(siteId, at) {
      const { data, error } = await service
        .from('incidents')
        .insert({ site_id: siteId, started_at: at, cause: 'unreachable' })
        .select('id')
        .single();
      if (duplicate(error)) return null;
      fail(error, 'incident_insert_failed');
      if (!data) throw new Error('incident_insert_failed');
      return data.id;
    },

    async resolveIncident(id, at) {
      const { error } = await service
        .from('incidents')
        .update({ resolved_at: at })
        .eq('id', id);
      fail(error, 'incident_resolve_failed');
    },

    async findAlert(userId, siteId, kind, dedup) {
      const { data, error } = await service
        .from('alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('site_id', siteId)
        .eq('kind', kind)
        .contains('payload', { dedup })
        .limit(1);
      fail(error, 'alert_lookup_failed');
      return (data ?? []).length > 0;
    },

    async insertAlert(input) {
      const { data, error } = await service
        .from('alerts')
        .insert({
          user_id: input.userId,
          site_id: input.siteId,
          kind: input.kind,
          payload: JSON.parse(JSON.stringify(input.payload)) as NonNullable<
            Database['public']['Tables']['alerts']['Insert']['payload']
          >,
        })
        .select('id')
        .single();
      if (duplicate(error)) return { status: 'duplicate' };
      fail(error, 'alert_insert_failed');
      if (!data) throw new Error('alert_insert_failed');
      return { status: 'created', id: data.id };
    },

    async markAlertSent(id, at) {
      const { error } = await service
        .from('alerts')
        .update({ sent_at: at })
        .eq('id', id);
      fail(error, 'alert_update_failed');
    },

    async pendingAlerts() {
      const { data, error } = await service
        .from('alerts')
        .select('id, user_id, site_id, kind, payload')
        .is('sent_at', null)
        .in('kind', [...ALERT_KINDS]);
      fail(error, 'alert_lookup_failed');
      const rows = data ?? [];
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const opted = new Map<string, boolean>();
      const locales = new Map<string, 'fr' | 'en'>();
      if (userIds.length > 0) {
        const profiles = await service
          .from('profiles')
          .select('id, email_opt_out, locale')
          .in('id', userIds);
        fail(profiles.error, 'profile_lookup_failed');
        for (const profile of profiles.data ?? []) {
          opted.set(profile.id, profile.email_opt_out);
          locales.set(profile.id, mailLocaleOf(profile.locale));
        }
      }
      const pending: PendingAlert[] = [];
      for (const row of rows) {
        const kind = ALERT_KINDS.find((item) => item === row.kind);
        const payload = parseAlertPayload(row.payload);
        if (!kind || !payload) continue;
        pending.push({
          id: row.id,
          userId: row.user_id,
          siteId: row.site_id,
          kind,
          payload,
          emailOptOut: opted.get(row.user_id) ?? false,
          locale: locales.get(row.user_id) ?? 'fr',
        });
      }
      return pending;
    },

    async advanceSchedule(siteId, now, next) {
      const { data, error } = await service
        .from('schedules')
        .update({ next_run_at: next })
        .eq('site_id', siteId)
        .lte('next_run_at', now.toISOString())
        .select('site_id');
      fail(error, 'schedule_update_failed');
      return (data ?? []).length > 0;
    },

    async enqueue(input) {
      const res = await requestAudit(service, {
        userId: input.userId,
        siteId: input.siteId,
        mode: input.mode,
        trigger: 'schedule',
        methodVersion: METHOD_VERSION,
        engineVersion: ENGINE_VERSION,
      });
      if (res.outcome === 'created' || res.outcome === 'existing') {
        return res.outcome;
      }
      return 'skip';
    },

    async rollup(now) {
      let purged = 0;
      const seen = new Set<string>();
      for (let batch = 0; batch < 10; batch += 1) {
        const { data, error } = await service
          .from('uptime_checks')
          .select('id, site_id, checked_at, ok, ms')
          .lt(
            'checked_at',
            new Date(now.getTime() - UPTIME_KEEP_MS).toISOString(),
          )
          .order('checked_at', { ascending: true })
          .limit(ROLLUP_BATCH);
        fail(error, 'uptime_rollup_failed');
        const rows: RawCheck[] = (data ?? []).map((row) => ({
          id: row.id,
          siteId: row.site_id,
          checkedAt: row.checked_at,
          ok: row.ok,
          ms: row.ms,
        }));
        const old = checksToPurge(rows, now);
        if (old.length === 0) break;
        for (const folded of foldUptime(old)) {
          await writeDaily(service, folded);
          seen.add(`${folded.siteId}:${folded.day}`);
        }
        const removed = await service
          .from('uptime_checks')
          .delete()
          .in(
            'id',
            old.map((row) => row.id),
          );
        fail(removed.error, 'uptime_purge_failed');
        purged += old.length;
        if (rows.length < ROLLUP_BATCH) break;
      }
      return { days: seen.size, purged };
    },

    userEmail: (userId) => readEmail(service, userId),
  };
}

export function supabaseDigestStore(service: Client): DigestStore {
  return {
    async recipients(now) {
      return assembleDigest(await readDigestFacts(service, now));
    },
    async claim(userId, week, windowStart) {
      const { error } = await service.from('rate_limits').insert({
        key: digestRateKey(userId, week),
        window_start: windowStart,
        count: 1,
      });
      if (!error) return true;
      if (duplicate(error)) return false;
      throw new Error('digest_claim_failed');
    },
    async release(userId, week, windowStart) {
      const { error } = await service
        .from('rate_limits')
        .delete()
        .eq('key', digestRateKey(userId, week))
        .eq('window_start', windowStart);
      fail(error, 'digest_release_failed');
    },
    userEmail: (userId) => readEmail(service, userId),
  };
}

async function readEmail(
  service: Client,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await service.auth.admin.getUserById(userId);
    const email = data.user?.email?.trim();
    if (error || !email) return null;
    return email;
  } catch {
    return null;
  }
}

export async function supabaseUnsubscribe(
  service: Client,
  userId: string,
): Promise<void> {
  const { error } = await service
    .from('profiles')
    .update({ email_opt_out: true, weekly_digest: false })
    .eq('id', userId);
  fail(error, 'unsubscribe_failed');
}

export function publicOrigin(env: NodeJS.ProcessEnv): string | null {
  const raw = env.APP_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function mailerFromEnv(
  env: NodeJS.ProcessEnv,
  origin: string | null,
  fetch: typeof globalThis.fetch | undefined,
): Mailer | null {
  const apiKey = env.BREVO_API_KEY?.trim() ?? '';
  if (!origin || apiKey.length < 8) return null;
  return createBrevoMailer({
    apiKey,
    senderEmail: senderEmail(origin),
    ...(fetch ? { fetch } : {}),
  });
}

export interface FromEnv {
  env: NodeJS.ProcessEnv;
  requestUrl: string;
  logger: Logger;
  fetch?: typeof globalThis.fetch;
}

export function scheduleDepsFromEnv(options: FromEnv): ScheduleDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const origin = publicOrigin(options.env);
  const wake = selfOrigin(options.env, options.requestUrl);
  const uptime = createUptimeProbe(origin ?? undefined);
  const endMail = auditEndEmailFns(service, options.env, options.logger);
  return {
    now: () => new Date(),
    store: supabaseScheduleStore(service),
    probe: (url) => uptime.check(url),
    mailer: mailerFromEnv(options.env, origin, options.fetch),
    appBaseUrl: origin,
    signingKey: db.serviceRoleKey,
    logger: options.logger,
    sweepEndEmails: async () => {
      await endMail.sweep();
    },
    trigger: wake
      ? createTrigger({
          origin: wake,
          key: db.serviceRoleKey,
          ...(options.fetch ? { fetch: options.fetch } : {}),
        })
      : async () => {},
  };
}

export function digestDepsFromEnv(options: FromEnv): DigestDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const origin = publicOrigin(options.env);
  return {
    now: () => new Date(),
    store: supabaseDigestStore(service),
    mailer: mailerFromEnv(options.env, origin, options.fetch),
    appBaseUrl: origin,
    signingKey: db.serviceRoleKey,
    logger: options.logger,
  };
}

export function unsubscribeDepsFromEnv(
  options: Pick<FromEnv, 'env' | 'logger'>,
): UnsubscribeDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  return {
    key: db.serviceRoleKey,
    logger: options.logger,
    apply: (userId) => supabaseUnsubscribe(service, userId),
  };
}
