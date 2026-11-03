import {
  decisionEquipe,
  expiresAt,
  gateLink,
  type LienRapport,
  type LinkKind,
  type LinkRecord,
  lienActif,
  type Plan,
  peutCreerLien,
  SHARE_TOKEN,
  sha256Hex,
  vueLien,
} from '@audigy/db';
import { z } from 'zod';
import { apiError, bearerToken } from './http.js';
import { errorCode, type Logger } from './log.js';

const AUDIT = z.uuid();

const createBody = z.object({
  auditId: AUDIT,
  kind: z.literal('public'),
});

const decisionBody = z.object({
  auditId: AUDIT,
  requestId: z.string().trim().min(1).max(80),
  decision: z.enum(['accept', 'refuse']),
  role: z.string().max(40),
  days: z.number().int(),
});

const revokeBody = z.object({ id: AUDIT });

const readBody = z.object({ token: z.string().max(80) });

export interface LienStore {
  now(): Date;
  planOf(userId: string): Promise<Plan>;
  owns(userId: string, auditId: string): Promise<boolean>;
  verified(auditId: string): Promise<boolean>;
  linksOf(userId: string): Promise<LinkRecord[]>;
  tokenOf(tokenHash: string): Promise<string | null>;
  mint(input: {
    ownerId: string;
    auditId: string;
    kind: LinkKind;
    expiresAt: string | null;
    ownerVerified: boolean;
    avecBrief: boolean;
    requestId: string | null;
  }): Promise<{ record: LinkRecord; token: string }>;
  markRevoked(link: LinkRecord, at: string): Promise<void>;
  byTokenHash(hash: string): Promise<LinkRecord | null>;
  rapport(auditId: string): Promise<LienRapport | null>;
  refuse(entry: {
    ownerId: string;
    auditId: string;
    requestId: string;
    at: string;
  }): Promise<void>;
}

export interface LienDeps {
  logger: Logger;
  store: LienStore;
  userFromToken(token: string): Promise<string | null>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (Buffer.byteLength(text) > 4096) throw new Error('too_large');
  return JSON.parse(text);
}

async function userId(req: Request, deps: LienDeps): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;
  return deps.userFromToken(token);
}

async function actifs(
  store: LienStore,
  user: string,
  now: Date,
): Promise<number> {
  const rows = await store.linksOf(user);
  return rows.filter((row) => lienActif(row, now)).length;
}

export async function handleLien(
  req: Request,
  deps: LienDeps,
): Promise<Response> {
  const path = new URL(req.url).pathname;
  try {
    if (path.endsWith('/decision')) return await decision(req, deps);
    if (req.method === 'GET') return await list(req, deps);
    if (req.method === 'POST') return await createPublic(req, deps);
    if (req.method === 'DELETE') return await revoke(req, deps);
    return apiError(
      405,
      'method_not_allowed',
      {},
      { allow: 'GET, POST, DELETE' },
    );
  } catch (error) {
    deps.logger.error('lien_erreur', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

async function list(req: Request, deps: LienDeps): Promise<Response> {
  const user = await userId(req, deps);
  if (!user) return apiError(401, 'unauthorized');
  const auditId = new URL(req.url).searchParams.get('auditId') ?? '';
  if (!AUDIT.safeParse(auditId).success) return apiError(400, 'invalid_input');
  if (!(await deps.store.owns(user, auditId)))
    return apiError(404, 'audit_not_found');
  const now = deps.store.now();
  const rows = (await deps.store.linksOf(user)).filter(
    (row) => row.auditId === auditId && lienActif(row, now),
  );
  const liens = [];
  for (const row of rows) {
    const token = await deps.store.tokenOf(row.tokenHash);
    if (!token || !SHARE_TOKEN.test(token)) continue;
    liens.push({
      id: row.id,
      kind: row.kind,
      url: `/partage/${token}`,
      expiresAt: row.expiresAt,
    });
  }
  deps.logger.info('lien_liste', { auditId, n: liens.length });
  return json(200, { liens });
}

async function createPublic(req: Request, deps: LienDeps): Promise<Response> {
  const user = await userId(req, deps);
  if (!user) return apiError(401, 'unauthorized');
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return apiError(400, 'invalid_input');
  }
  const parsed = createBody.safeParse(body);
  if (!parsed.success) return apiError(400, 'invalid_input');
  if (!(await deps.store.owns(user, parsed.data.auditId))) {
    return apiError(404, 'audit_not_found');
  }
  const now = deps.store.now();
  const plan = await deps.store.planOf(user);
  if (!(await room(deps, user, plan, now))) return apiError(429, 'user_limit');
  const minted = await deps.store.mint({
    ownerId: user,
    auditId: parsed.data.auditId,
    kind: 'public',
    expiresAt: expiresAt('public', now, 30),
    ownerVerified: await deps.store.verified(parsed.data.auditId),
    avecBrief: false,
    requestId: null,
  });
  deps.logger.info('lien_cree', { kind: 'public', id: minted.record.id });
  return json(201, {
    ok: true,
    id: minted.record.id,
    kind: 'public',
    url: `/partage/${minted.token}`,
    expiresAt: minted.record.expiresAt,
  });
}

async function room(
  deps: LienDeps,
  user: string,
  plan: Plan,
  now: Date,
): Promise<boolean> {
  return peutCreerLien(plan, await actifs(deps.store, user, now));
}

async function decision(req: Request, deps: LienDeps): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  const user = await userId(req, deps);
  if (!user) return apiError(401, 'unauthorized');
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return apiError(400, 'invalid_input');
  }
  const parsed = decisionBody.safeParse(body);
  if (!parsed.success) return apiError(400, 'invalid_input');
  const choice = decisionEquipe(parsed.data);
  if (!choice.ok && choice.reason === 'invalid')
    return apiError(400, 'invalid_input');
  if (!(await deps.store.owns(user, parsed.data.auditId))) {
    return apiError(404, 'audit_not_found');
  }
  const now = deps.store.now();
  if (!choice.ok) {
    await deps.store.refuse({
      ownerId: user,
      auditId: parsed.data.auditId,
      requestId: parsed.data.requestId,
      at: now.toISOString(),
    });
    deps.logger.info('lien_refuse', {
      auditId: parsed.data.auditId,
      requestId: parsed.data.requestId,
    });
    return json(200, { ok: true, decision: 'refuse' });
  }
  const plan = await deps.store.planOf(user);
  if (!(await room(deps, user, plan, now))) return apiError(429, 'user_limit');
  const minted = await deps.store.mint({
    ownerId: user,
    auditId: parsed.data.auditId,
    kind: 'team',
    expiresAt: expiresAt('team', now, choice.days),
    ownerVerified: await deps.store.verified(parsed.data.auditId),
    avecBrief: choice.avecBrief,
    requestId: parsed.data.requestId,
  });
  deps.logger.info('lien_equipe', { id: minted.record.id });
  return json(201, {
    ok: true,
    decision: 'accept',
    id: minted.record.id,
    kind: 'team',
    url: `/partage/${minted.token}`,
    expiresAt: minted.record.expiresAt,
  });
}

async function revoke(req: Request, deps: LienDeps): Promise<Response> {
  const user = await userId(req, deps);
  if (!user) return apiError(401, 'unauthorized');
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return apiError(400, 'invalid_input');
  }
  const parsed = revokeBody.safeParse(body);
  if (!parsed.success) return apiError(400, 'invalid_input');
  const rows = await deps.store.linksOf(user);
  const link = rows.find((row) => row.id === parsed.data.id);
  if (!link) return apiError(404, 'audit_not_found');
  const at = deps.store.now().toISOString();
  await deps.store.markRevoked(link, at);
  deps.logger.info('lien_revoque', { id: link.id, kind: link.kind });
  return json(200, { ok: true, id: link.id });
}

/** Lecture anonyme. Le corps porte le jeton pour qu’il ne soit pas dans l’adresse. */
export async function handlePartage(
  req: Request,
  deps: LienDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  let token = '';
  try {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = readBody.safeParse(body);
    if (!parsed.success) return json(404, { error: 'absent' });
    token = parsed.data.token;
    if (!SHARE_TOKEN.test(token)) return json(404, { error: 'absent' });
    const hash = await sha256Hex(token);
    const link = await deps.store.byTokenHash(hash);
    const now = deps.store.now();
    const gate = gateLink(link, now);
    if (!link || gate.state === 'closed') {
      if (link && link.revokedAt === null)
        await deps.store.markRevoked(link, now.toISOString());
      deps.logger.info('lien_ferme', { id: link?.id ?? null });
      return json(404, { error: 'absent' });
    }
    if (gate.state === 'retired' && link.revokedAt === null) {
      await deps.store.markRevoked(link, now.toISOString());
    }
    const rapport = await deps.store.rapport(link.auditId);
    if (!rapport) return json(404, { error: 'absent' });
    const vue = vueLien(gate, rapport);
    if (!vue) return json(404, { error: 'absent' });
    deps.logger.info('lien_lu', { id: link.id, access: vue.access });
    return json(200, vue);
  } catch (error) {
    deps.logger.error('lien_lecture', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}
