import {
  isLockedDomain,
  isOpenDomain,
  OPEN_DOMAINS,
  partialDomainCount,
  partialLabel,
} from '@audigy/db';
import {
  type Check,
  DOMAINS,
  type FixSheet,
  type RunContext,
} from '@audigy/engine';
import type { RequestBudgetOptions } from '@audigy/net';
import { createAuditContext, defaultChecks } from './context.js';
import {
  type ApiDeps,
  type AuditView,
  apiError,
  type FindingView,
} from './http.js';
import type { LabConfig } from './lab.js';
import { errorCode } from './log.js';
import {
  type AuditSummary,
  assemble,
  browserPlaceholders,
  findingRows,
  ORCHESTRATION_REASONS,
  runServerPhase,
  splitChecks,
} from './pipeline.js';
import {
  InvalidSiteUrl,
  normalizeSiteUrl,
  type SiteInput,
  targetOf,
} from './target.js';

const HUB_DOMAINS = DOMAINS.filter(
  (domain) => domain !== 'reputation' && domain !== 'disponibilite',
);

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

const ACTIONABLE: Record<string, number> = { fail: 0, warn: 0 };

function byPriority(a: FindingView, b: FindingView): number {
  const ra = ACTIONABLE[a.status] ?? 1;
  const rb = ACTIONABLE[b.status] ?? 1;
  if (ra !== rb) return ra - rb;
  if (ra === 0) {
    const effort = (f: FindingView) =>
      f.effortMinutes ?? Number.POSITIVE_INFINITY;
    const diff =
      b.severity - a.severity || b.impact - a.impact || effort(a) - effort(b);
    if (diff !== 0) return diff;
  }
  return a.checkId < b.checkId ? -1 : a.checkId > b.checkId ? 1 : 0;
}

interface PassiveGuestOptions {
  site: SiteInput;
  env?: NodeJS.ProcessEnv;
  lab?: LabConfig | null;
  net?: Partial<RunContext['net']>;
  checks?: readonly Check[];
  fixes?: ReadonlyMap<string, FixSheet>;
  budget?: RequestBudgetOptions;
}

/**
 * Même parcours que l’audit passif connecté, sans file ni runner GitHub :
 * checks serveur, navigateur laissé non testé, site non vérifié.
 */
export async function runPassiveGuest(
  options: PassiveGuestOptions,
): Promise<AuditSummary> {
  const env = options.env ?? process.env;
  const { ctx, available } = createAuditContext({
    target: targetOf(options.site),
    verified: false,
    env,
    lab: options.lab ?? null,
    ...(options.net ? { net: options.net } : {}),
    ...(options.budget ? { budget: options.budget } : {}),
  });
  const checks = options.checks ?? defaultChecks(env);
  const { server, browser } = splitChecks(checks);
  const serverOutcomes = await runServerPhase(server, ctx, { available });
  return assemble(
    [
      ...serverOutcomes,
      ...browserPlaceholders(browser, ORCHESTRATION_REASONS.runnerAbsent),
    ],
    options.fixes ?? new Map(),
  );
}

/** Soft-gate anonyme : note partielle, domaines ouverts, sensibles absents. */
function guestAuditView(site: SiteInput, summary: AuditSummary): AuditView {
  const scored = new Map(summary.domains.map((row) => [row.domain, row]));
  const domains = HUB_DOMAINS.map((domain) => {
    if (isLockedDomain(domain)) {
      return {
        domain,
        score: null,
        coverage: 0,
        level: 'locked',
        locked: true,
      };
    }
    const row = scored.get(domain);
    return {
      domain,
      score: row?.score ?? null,
      coverage: row?.coverage ?? 0,
      level: row?.level ?? 'untested',
      locked: false,
    };
  });
  const openCount = partialDomainCount(domains);
  const now = new Date().toISOString();
  return {
    audit: {
      id: crypto.randomUUID(),
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: summary.methodVersion,
      engineVersion: summary.engineVersion,
      globalScore: null,
      siteVerified: false,
      partialLabel: openCount > 0 ? partialLabel(openCount) : null,
      coverage: openCount > 0 ? openCount / OPEN_DOMAINS.length : null,
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      error: null,
      site: {
        id: crypto.randomUUID(),
        url: site.url,
        label: site.label,
        scope: site.scope,
        hosting: site.hosting,
      },
    },
    domains,
    findings: findingRows(summary)
      .filter((row) => isOpenDomain(row.domain))
      .map((row) => ({
        domain: row.domain,
        checkId: row.check_id,
        status: row.status,
        severity: row.severity,
        impact: row.impact,
        score: row.score,
        measured: row.measured,
        messageKey: row.message_key,
        params: row.params,
        fixKey: null,
        effortMinutes: row.effort_minutes,
        reason: row.reason,
      }))
      .sort(byPriority),
  };
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 4096) throw new Error('too_large');
  return JSON.parse(text);
}

/** `POST /api/guest-audits` : sans jeton, plafond serveur, audit passif filtré. */
export async function handleGuestCreate(
  req: Request,
  deps: ApiDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  try {
    if (!deps.guardGuest || !deps.guestAudit) return apiError(500, 'internal');
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiError(400, 'invalid_input');
    }
    const record = body as { url?: unknown };
    if (typeof record.url !== 'string' || Object.keys(record).length !== 1) {
      return apiError(400, 'invalid_input');
    }
    let site: SiteInput;
    try {
      site = normalizeSiteUrl(record.url, { allowLab: deps.allowLab === true });
    } catch (error) {
      if (error instanceof InvalidSiteUrl) return apiError(400, 'invalid_url');
      throw error;
    }
    const gate = await deps.guardGuest(req);
    if (!gate.ok) {
      return apiError(
        429,
        'guest_limit',
        { retryAfter: gate.retryAfter },
        { 'retry-after': String(gate.retryAfter) },
      );
    }
    const view = guestAuditView(site, await deps.guestAudit(site));
    deps.logger.info('guest_audit', { auditId: view.audit.id });
    return json(202, {
      auditId: view.audit.id,
      status: 'done',
      view,
    });
  } catch (error) {
    deps.logger.error('guest_audit_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}
