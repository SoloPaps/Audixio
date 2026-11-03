import {
  isLockedDomain,
  LOCKED_DOMAINS,
  rightsFor,
  seesFullReport,
  type Viewer,
} from '@audigy/db';
import { z } from 'zod';
import {
  type AuditView,
  apiError,
  bearerToken,
  type FindingView,
} from './http.js';
import { errorCode, type Logger } from './log.js';
import { auditIdSchema } from './target.js';

const MAX_BODY_BYTES = 65_536;
export const BRIEF_EXPORT_FILENAME = 'audixio-prompt-remediation.md';

const choiceSchema = z
  .object({
    checkId: z.string().regex(/^[a-z0-9_]{1,40}(?:\.[a-z0-9_]{1,80})+$/),
    mode: z.enum(['fix', 'verif']),
  })
  .strip();

export interface BriefExportItem {
  checkId: string;
  title: string;
  proof: string;
  mode: 'fix' | 'verif';
}

export interface BriefRenderInput {
  level: 'partiel' | 'complet';
  url: string;
  at: string | null;
  items: readonly BriefExportItem[];
}

export interface BriefExportDeps {
  logger: Logger;
  userFromToken(token: string): Promise<string | null>;
  readAudit(token: string, auditId: string): Promise<AuditView | null>;
  /** Politique d’accès. La production s’appuie sur `siteVerified`, jamais sur le client. */
  viewerFor(view: AuditView): Viewer;
  /** Libellés serveur. Ignoré pour un constat retiré par le soft-gate. */
  label(finding: FindingView): { title: string; proof: string };
  /** Corps du fichier. N’a pas les constats retirés. */
  render(input: BriefRenderInput): string;
}

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
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function forbidden(): Response {
  return json(403, {
    error: 'forbidden',
    messageKey: 'api.error.forbidden',
  });
}

function oneLine(value: string): string {
  let cleaned = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    cleaned += code < 32 || code === 127 ? ' ' : char;
  }
  return cleaned.replace(/\s+/g, ' ').trim().slice(0, 400);
}

function domainLocked(view: AuditView, viewer: Viewer): Set<string> {
  const locked = new Set<string>();
  for (const row of view.domains) {
    if (row.locked === true) locked.add(row.domain);
  }
  if (!seesFullReport(viewer)) {
    for (const name of LOCKED_DOMAINS) locked.add(name);
  }
  return locked;
}

function allowedFindings(view: AuditView, viewer: Viewer): FindingView[] {
  const locked = domainLocked(view, viewer);
  return view.findings.filter((finding) => {
    if (locked.has(finding.domain)) return false;
    if (!seesFullReport(viewer) && isLockedDomain(finding.domain)) return false;
    return true;
  });
}

function hiddenNeedles(hidden: readonly FindingView[]): string[] {
  const needles: string[] = [];
  for (const finding of hidden) {
    if (finding.checkId.length >= 4) needles.push(finding.checkId);
    if (finding.messageKey.length >= 4) needles.push(finding.messageKey);
    if (finding.fixKey && finding.fixKey.length >= 4)
      needles.push(finding.fixKey);
    if (
      finding.reason &&
      finding.reason.length >= 4 &&
      (finding.reason.startsWith('reason.') || finding.reason.includes('.'))
    ) {
      needles.push(finding.reason);
    }
  }
  return needles;
}

function leaks(markdown: string, hidden: readonly FindingView[]): boolean {
  return hiddenNeedles(hidden).some((needle) => markdown.includes(needle));
}

async function readSelection(
  req: Request,
): Promise<
  | { ok: true; selection: { checkId: string; mode: 'fix' | 'verif' }[] | null }
  | { ok: false }
> {
  if (req.method === 'GET') return { ok: true, selection: null };
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return { ok: false };
  let text = '';
  try {
    text = await req.text();
  } catch {
    return { ok: false };
  }
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return { ok: false };
  if (text.trim() === '') return { ok: true, selection: [] };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { ok: false };
  const raw = (body as { selection?: unknown }).selection;
  if (raw === undefined) return { ok: true, selection: [] };
  if (!Array.isArray(raw) || raw.length > 200) return { ok: false };
  const selection: { checkId: string; mode: 'fix' | 'verif' }[] = [];
  for (const item of raw) {
    const parsed = choiceSchema.safeParse(item);
    if (parsed.success) selection.push(parsed.data);
  }
  return { ok: true, selection };
}

function chosenItems(
  allowed: readonly FindingView[],
  selection: readonly { checkId: string; mode: 'fix' | 'verif' }[] | null,
  label: BriefExportDeps['label'],
): BriefExportItem[] {
  const byId = new Map(allowed.map((finding) => [finding.checkId, finding]));
  const picked: { finding: FindingView; mode: 'fix' | 'verif' }[] = [];
  if (selection === null) {
    for (const finding of allowed) {
      if (finding.status === 'fail') picked.push({ finding, mode: 'fix' });
      else if (finding.status === 'warn')
        picked.push({ finding, mode: 'verif' });
    }
  } else {
    const seen = new Set<string>();
    for (const choice of selection) {
      if (seen.has(choice.checkId)) continue;
      const finding = byId.get(choice.checkId);
      if (!finding) continue;
      seen.add(choice.checkId);
      picked.push({ finding, mode: choice.mode });
    }
  }
  return picked.map(({ finding, mode }) => {
    const named = label(finding);
    return {
      checkId: finding.checkId,
      title: oneLine(named.title),
      proof: oneLine(named.proof),
      mode,
    };
  });
}

/**
 * `GET` ou `POST /api/audits/:id/brief`.
 * Le corps client ne fournit que des identifiants et un mode.
 * Les titres viennent du serveur, après le filtre soft-gate.
 */
export async function handleBriefExport(
  req: Request,
  deps: BriefExportDeps,
  id: string | undefined,
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET, POST' });
  }
  try {
    const token = bearerToken(req);
    if (!token) return apiError(401, 'unauthorized');
    const userId = await deps.userFromToken(token);
    if (!userId) return apiError(401, 'unauthorized');
    const parsedId = auditIdSchema.safeParse(id);
    if (!parsedId.success) return apiError(400, 'invalid_input');
    const selection = await readSelection(req);
    if (!selection.ok) return apiError(400, 'invalid_input');
    const view = await deps.readAudit(token, parsedId.data);
    if (!view) return apiError(404, 'audit_not_found');
    if (view.audit.status === 'queued' || view.audit.status === 'running') {
      return apiError(404, 'audit_not_found');
    }
    const viewer = deps.viewerFor(view);
    const rights = rightsFor(viewer);
    if (rights.brief === 'aucun') return forbidden();
    const allowed = allowedFindings(view, viewer);
    const hidden = view.findings.filter(
      (finding) => !allowed.some((item) => item.checkId === finding.checkId),
    );
    const level = rights.brief === 'complet' ? 'complet' : 'partiel';
    const items = chosenItems(allowed, selection.selection, deps.label);
    let markdown = '';
    try {
      markdown = deps.render({
        level,
        url: oneLine(view.audit.site.url),
        at: view.audit.finishedAt ?? view.audit.createdAt,
        items,
      });
    } catch (error) {
      deps.logger.error('brief_export_failed', { code: errorCode(error) });
      return apiError(500, 'internal');
    }
    if (leaks(markdown, hidden) || markdown.includes(view.audit.id)) {
      deps.logger.error('brief_export_blocked', { code: 'leak' });
      return apiError(500, 'internal');
    }
    return new Response(markdown, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': `attachment; filename="${BRIEF_EXPORT_FILENAME}"`,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      },
    });
  } catch (error) {
    deps.logger.error('brief_export_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}
