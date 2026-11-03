import { isLockedDomain } from '@audigy/db';
import { DOMAINS, ENGINE_VERSION, METHOD_VERSION } from '@audigy/engine';
import { type ApiDeps, type AuditView, apiError } from './http.js';
import { errorCode } from './log.js';
import { InvalidSiteUrl, normalizeSiteUrl } from './target.js';

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

/** Hub soft-gate : note absente, ouverts sans détail, sensibles verrouillés. */
export function guestPreview(
  raw: string,
  allowLab: boolean,
): AuditView | { error: 'invalid_url' } {
  let site: ReturnType<typeof normalizeSiteUrl>;
  try {
    site = normalizeSiteUrl(raw, { allowLab });
  } catch (error) {
    if (error instanceof InvalidSiteUrl) return { error: 'invalid_url' };
    throw error;
  }
  const auditId = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    audit: {
      id: auditId,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: METHOD_VERSION,
      engineVersion: ENGINE_VERSION,
      globalScore: null,
      siteVerified: false,
      partialLabel: null,
      coverage: null,
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
    domains: HUB_DOMAINS.map((domain) => ({
      domain,
      score: null,
      coverage: 0,
      level: 'untested',
      locked: isLockedDomain(domain),
    })),
    findings: [],
  };
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 4096) throw new Error('too_large');
  return JSON.parse(text);
}

/** `POST /api/guest-audits` : sans jeton, plafond serveur, hub soft-gate. */
export async function handleGuestCreate(
  req: Request,
  deps: ApiDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  try {
    if (!deps.guardGuest) return apiError(500, 'internal');
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
    const preview = guestPreview(record.url, deps.allowLab === true);
    if ('error' in preview) return apiError(400, 'invalid_url');
    const gate = await deps.guardGuest(req);
    if (!gate.ok) {
      return apiError(
        429,
        'guest_limit',
        { retryAfter: gate.retryAfter },
        { 'retry-after': String(gate.retryAfter) },
      );
    }
    deps.logger.info('guest_audit', { auditId: preview.audit.id });
    return json(202, {
      auditId: preview.audit.id,
      status: 'done',
      view: preview,
    });
  } catch (error) {
    deps.logger.error('guest_audit_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}
