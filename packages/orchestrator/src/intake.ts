import {
  accessBudgets,
  clientIp,
  hostOf,
  plainText,
  type RateBudget,
  retryAfterSeconds,
  robotBudgets,
  sha256Hex,
} from '@audigy/db';
import { validEmail, windowStartIso } from '@audigy/db/auth-policy';
import { apiError } from './http.js';
import { errorCode, type Logger } from './log.js';

export interface IntakeRecord {
  action: 'access_request' | 'robot_optout';
  actor: string | null;
  target: string;
  details: Record<string, string>;
}

export interface IntakeDeps {
  logger: Logger;
  now(): number;
  userId(req: Request): Promise<string | null>;
  /** `false` : plafond atteint. Une erreur de compteur refuse aussi. */
  take(budget: RateBudget, nowMs: number): Promise<boolean>;
  record(entry: IntakeRecord): Promise<void>;
}

function tooMany(nowMs: number, windowMs: number): Response {
  const retryAfter = retryAfterSeconds(nowMs, windowMs);
  return apiError(
    429,
    'rate_limited',
    { retryAfter },
    { 'retry-after': String(retryAfter) },
  );
}

async function readBody(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > 4096) throw new Error('too_large');
  const text = await req.text();
  if (Buffer.byteLength(text) > 4096) throw new Error('too_large');
  return JSON.parse(text);
}

function field(body: unknown, name: string): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const value = (body as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : '';
}

async function guard(
  deps: IntakeDeps,
  budgets: readonly RateBudget[],
): Promise<Response | null> {
  const now = deps.now();
  for (const budget of budgets) {
    const ok = await deps.take(budget, now);
    if (!ok) return tooMany(now, budget.windowMs);
  }
  return null;
}

function accepted(): Response {
  return new Response(
    JSON.stringify({ ok: true, messageKey: 'api.intake.accepted' }),
    {
      status: 202,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

/** `POST /api/demandes-acces` : e-mail du propriétaire, message facultatif. */
export async function handleAccessRequest(
  req: Request,
  deps: IntakeDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  try {
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const email = field(body, 'email').trim().toLowerCase();
    const message = plainText(field(body, 'message'), 2000);
    if (!validEmail(email)) return apiError(400, 'invalid_input');
    const userId = await deps.userId(req);
    const blocked = await guard(
      deps,
      accessBudgets({ ip: clientIp(req), email, userId }),
    );
    if (blocked) {
      deps.logger.info('intake_limited', { action: 'access_request' });
      return blocked;
    }
    const details: Record<string, string> = { email };
    if (message) details.message = message;
    await deps.record({
      action: 'access_request',
      actor: userId,
      target: 'acces',
      details,
    });
    deps.logger.info('intake_accepted', { action: 'access_request' });
    return accepted();
  } catch (error) {
    deps.logger.error('intake_failed', { code: errorCode(error) });
    return apiError(503, 'unavailable');
  }
}

/** `POST /api/robot` : domaine, e-mail, motif facultatif. N’exclut pas tout seul. */
export async function handleRobotOptOut(
  req: Request,
  deps: IntakeDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  try {
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const email = field(body, 'email').trim().toLowerCase();
    const domain = hostOf(field(body, 'domain'));
    const reason = plainText(field(body, 'reason'), 600);
    if (!validEmail(email) || !domain) return apiError(400, 'invalid_input');
    const userId = await deps.userId(req);
    const blocked = await guard(
      deps,
      robotBudgets({ ip: clientIp(req), email, domain, userId }),
    );
    if (blocked) {
      deps.logger.info('intake_limited', { action: 'robot_optout' });
      return blocked;
    }
    const details: Record<string, string> = { email, domain };
    if (reason) details.reason = reason;
    await deps.record({
      action: 'robot_optout',
      actor: userId,
      target: domain,
      details,
    });
    deps.logger.info('intake_accepted', { action: 'robot_optout' });
    return accepted();
  } catch (error) {
    deps.logger.error('intake_failed', { code: errorCode(error) });
    return apiError(503, 'unavailable');
  }
}

/** Empreinte + fenêtre. `false` si le compteur refuse ou tombe. */
export async function takeRateLimit(
  consume: (input: {
    key: string;
    windowStart: string;
    limit: number;
  }) => Promise<boolean>,
  budget: RateBudget,
  nowMs: number,
): Promise<boolean> {
  const key = await sha256Hex(`audixio\n${budget.scope}\n${budget.material}`);
  return consume({
    key,
    windowStart: windowStartIso(nowMs, budget.windowMs),
    limit: budget.limit,
  });
}
