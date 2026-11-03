import {
  createServiceClient,
  createUserClient,
  type Database,
  dbEnvFrom,
  GRADES,
  type Grade,
  type Json,
  type LienRapport,
  type LinkKind,
  type LinkRecord,
  sha256Hex,
} from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LienDeps, LienStore } from './liens-http.js';
import type { Logger } from './log.js';

type Client = SupabaseClient<Database>;

/**
 * `reports.link_kind` et `reports.expires_at` sont lus par `read_shared_score`.
 * Le journal `audit_log` (action `share_link`) ne garde que l’empreinte du jeton.
 */
const ACTION = 'share_link';

function asGrade(value: string | null): Grade | null {
  if (value && (GRADES as readonly string[]).includes(value))
    return value as Grade;
  return null;
}

function asKind(value: unknown): LinkKind | null {
  if (value === 'public' || value === 'team') return value;
  return null;
}

function detailsOf(value: Json): Record<string, Json | undefined> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function recordFrom(
  id: string,
  actor: string | null,
  at: string,
  details: Json,
): LinkRecord | null {
  const row = detailsOf(details);
  if (!row || !actor) return null;
  const kind = asKind(row.kind);
  const auditId = row.audit_id;
  const tokenHash = row.token_sha256;
  if (!kind || typeof auditId !== 'string' || typeof tokenHash !== 'string') {
    return null;
  }
  const expires = row.expires_at;
  const revoked = row.revoked_at;
  return {
    id,
    auditId,
    ownerId: actor,
    kind,
    tokenHash,
    createdAt: at,
    expiresAt: typeof expires === 'string' ? expires : null,
    revokedAt: typeof revoked === 'string' ? revoked : null,
    ownerVerified: row.owner_verified === true,
    avecBrief: row.avec_brief === true,
  };
}

/**
 * La colonne `reports` est la date que `read_shared_score` applique.
 * Le journal peut encore porter l’ancienne valeur : la colonne gagne.
 */
async function applyReports(
  service: Client,
  rows: LinkRecord[],
): Promise<LinkRecord[]> {
  if (rows.length === 0) return rows;
  const { data, error } = await service
    .from('reports')
    .select('id, expires_at, revoked_at')
    .in(
      'id',
      rows.map((row) => row.id),
    );
  if (error) throw new Error('lien_recherche');
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return rows.map((row) => {
    const live = byId.get(row.id);
    if (!live) return row;
    return {
      ...row,
      expiresAt: live.expires_at ?? row.expiresAt,
      revokedAt: live.revoked_at ?? row.revokedAt,
    };
  });
}

export function supabaseLienStore(
  service: Client,
  asUser: Client | null,
): LienStore {
  return {
    now: () => new Date(),
    async planOf(userId) {
      const { data, error } = await service
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw new Error('lien_plan');
      return data?.plan === 'pro' ? 'pro' : 'free';
    },
    async owns(userId, auditId) {
      const { data: audit, error } = await service
        .from('audits')
        .select('site_id')
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw new Error('lien_audit');
      if (!audit) return false;
      const { data: site, error: siteError } = await service
        .from('sites')
        .select('owner_id')
        .eq('id', audit.site_id)
        .maybeSingle();
      if (siteError) throw new Error('lien_site');
      return site?.owner_id === userId;
    },
    async verified(auditId) {
      const { data: audit, error } = await service
        .from('audits')
        .select('site_id')
        .eq('id', auditId)
        .maybeSingle();
      if (error || !audit) return false;
      const { data, error: readError } = await service
        .from('site_verifications')
        .select('status')
        .eq('site_id', audit.site_id)
        .eq('status', 'verified')
        .limit(1);
      if (readError) throw new Error('lien_preuve');
      return (data ?? []).length > 0;
    },
    async linksOf(userId) {
      const { data, error } = await service
        .from('audit_log')
        .select('target, actor, at, details')
        .eq('actor', userId)
        .eq('action', ACTION);
      if (error) throw new Error('lien_liste');
      const rows: LinkRecord[] = [];
      for (const row of data ?? []) {
        if (!row.target) continue;
        const parsed = recordFrom(row.target, row.actor, row.at, row.details);
        if (parsed) rows.push(parsed);
      }
      return applyReports(service, rows);
    },
    async tokenOf(hash) {
      const { data, error } = await service
        .from('audit_log')
        .select('target, details')
        .eq('action', ACTION)
        .contains('details', { token_sha256: hash })
        .limit(1);
      if (error) throw new Error('lien_jeton');
      const id = data?.[0]?.target;
      if (!id) return null;
      const { data: report, error: readError } = await service
        .from('reports')
        .select('share_token')
        .eq('id', id)
        .maybeSingle();
      if (readError) throw new Error('lien_jeton');
      return report?.share_token ?? null;
    },
    async mint(input) {
      if (!asUser) throw new Error('lien_session');
      const createdAt = new Date().toISOString();
      const { data, error } = await asUser
        .from('reports')
        .insert({
          audit_id: input.auditId,
          visibility: 'link',
          link_kind: input.kind,
          expires_at: input.expiresAt,
          created_at: createdAt,
        })
        .select('id, share_token')
        .single();
      if (error || !data?.share_token) throw new Error('lien_creation');
      const tokenHash = await sha256Hex(data.share_token);
      const { error: logError } = await service.from('audit_log').insert({
        actor: input.ownerId,
        action: ACTION,
        target: data.id,
        at: createdAt,
        details: {
          kind: input.kind,
          audit_id: input.auditId,
          token_sha256: tokenHash,
          expires_at: input.expiresAt,
          revoked_at: null,
          owner_verified: input.ownerVerified,
          avec_brief: input.avecBrief,
          request_id: input.requestId,
        },
      });
      if (logError) {
        await service
          .from('reports')
          .update({ revoked_at: createdAt })
          .eq('id', data.id);
        throw new Error('lien_journal');
      }
      const record: LinkRecord = {
        id: data.id,
        auditId: input.auditId,
        ownerId: input.ownerId,
        kind: input.kind,
        tokenHash,
        createdAt,
        expiresAt: input.expiresAt,
        revokedAt: null,
        ownerVerified: input.ownerVerified,
        avecBrief: input.avecBrief,
      };
      return { record, token: data.share_token };
    },
    async markRevoked(link, at) {
      const { error } = await service
        .from('reports')
        .update({ revoked_at: at })
        .eq('id', link.id);
      if (error) throw new Error('lien_retrait');
      const { data, error: readError } = await service
        .from('audit_log')
        .select('id, details')
        .eq('action', ACTION)
        .eq('target', link.id)
        .limit(1);
      if (readError) throw new Error('lien_retrait');
      const row = data?.[0];
      const details = detailsOf(row?.details ?? null) ?? {};
      if (!row) return;
      const { error: writeError } = await service
        .from('audit_log')
        .update({ details: { ...details, revoked_at: at } })
        .eq('id', row.id);
      if (writeError) throw new Error('lien_retrait');
      link.revokedAt = at;
    },
    async byTokenHash(hash) {
      const { data, error } = await service
        .from('audit_log')
        .select('target, actor, at, details')
        .eq('action', ACTION)
        .contains('details', { token_sha256: hash })
        .limit(1);
      if (error) throw new Error('lien_recherche');
      const row = data?.[0];
      if (!row?.target) return null;
      const parsed = recordFrom(row.target, row.actor, row.at, row.details);
      if (!parsed) return null;
      const [live] = await applyReports(service, [parsed]);
      return live ?? null;
    },
    async rapport(auditId) {
      const { data: audit, error } = await service
        .from('audits')
        .select('id, site_id, finished_at, method_version, global_score')
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw new Error('lien_rapport');
      if (!audit) return null;
      const { data: site, error: siteError } = await service
        .from('sites')
        .select('label, url')
        .eq('id', audit.site_id)
        .maybeSingle();
      if (siteError || !site) throw new Error('lien_rapport');
      const { data: domains, error: domainError } = await service
        .from('domain_scores')
        .select('domain, score, grade, level')
        .eq('audit_id', auditId);
      if (domainError) throw new Error('lien_rapport');
      const { data: findings, error: findError } = await service
        .from('findings')
        .select(
          'domain, check_id, status, severity, message_key, measured, fix_key',
        )
        .eq('audit_id', auditId);
      if (findError) throw new Error('lien_rapport');
      const view: LienRapport = {
        label: site.label,
        url: site.url,
        finishedAt: audit.finished_at,
        methodVersion: audit.method_version,
        globalScore: audit.global_score,
        globalGrade: null,
        auditId: audit.id,
        domains: (domains ?? []).map((row) => ({
          domain: row.domain,
          score: row.score,
          grade: asGrade(row.grade),
          level: row.level,
        })),
        findings: (findings ?? []).map((row) => ({
          domain: row.domain,
          checkId: row.check_id,
          status: row.status,
          severity: row.severity,
          messageKey: row.message_key,
          measured: row.measured,
          fixKey: row.fix_key,
        })),
        briefPartiel: null,
        briefComplet: null,
      };
      return view;
    },
    async refuse(entry) {
      const { error } = await service.from('audit_log').insert({
        actor: entry.ownerId,
        action: 'share_refused',
        target: entry.auditId,
        at: entry.at,
        details: { request_id: entry.requestId },
      });
      if (error) throw new Error('lien_refus');
    },
  };
}

export function lienDepsFromEnv(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger;
  accessToken?: string | null;
}): LienDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const asUser = options.accessToken
    ? createUserClient({ ...db, accessToken: options.accessToken })
    : null;
  return {
    logger: options.logger,
    store: supabaseLienStore(service, asUser),
    async userFromToken(token) {
      const anon = createUserClient(db);
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
  };
}
