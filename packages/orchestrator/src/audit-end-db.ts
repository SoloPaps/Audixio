import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Database, Json } from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type AuditEndRecord,
  type AuditEndStore,
  sendAuditEndEmail,
  sweepAuditEndEmails,
} from './audit-end-mail.js';
import { mailLocaleOf } from './copy.js';
import type { Logger } from './log.js';

type Service = SupabaseClient<Database>;

interface FindingLine {
  status: string;
  severity: number;
  impact: number;
  message_key: string;
  params: Json;
  fix_key: string | null;
  effort_minutes: number | null;
}

function asParams(value: Json): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'number') out[key] = item;
  }
  return out;
}

function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_raw, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

export function priorityLines(
  findings: readonly FindingLine[],
  catalog: Readonly<Record<string, string>>,
): string[] {
  return [...findings]
    .filter((row) => row.status === 'fail' || row.status === 'warn')
    .sort((a, b) => {
      const effort = (row: FindingLine) =>
        row.effort_minutes ?? Number.POSITIVE_INFINITY;
      return (
        b.severity - a.severity || b.impact - a.impact || effort(a) - effort(b)
      );
    })
    .slice(0, 3)
    .map((row) => {
      const template = catalog[row.message_key];
      if (template) return interpolate(template, asParams(row.params));
      return row.message_key;
    });
}

export function supabaseAuditEndStore(
  service: Service,
  catalogFor: (locale: 'fr' | 'en') => Readonly<Record<string, string>>,
): AuditEndStore {
  return {
    async load(auditId) {
      const { data: audit, error } = await service
        .from('audits')
        .select(
          'id, status, trigger, error, global_score, site_id, sites(host, url, owner_id)',
        )
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw new Error('audit_end_load');
      if (!audit) return null;
      const site = audit.sites as {
        host: string;
        url: string;
        owner_id: string;
      } | null;
      if (!site) return null;
      const { data: profile } = await service
        .from('profiles')
        .select('locale, notify_audit_end')
        .eq('id', site.owner_id)
        .maybeSingle();
      const { data: user } = await service.auth.admin.getUserById(
        site.owner_id,
      );
      const locale = mailLocaleOf(profile?.locale);
      const { data: findings } = await service
        .from('findings')
        .select(
          'status, severity, impact, message_key, params, fix_key, effort_minutes',
        )
        .eq('audit_id', auditId);
      const record: AuditEndRecord = {
        auditId: audit.id,
        status: audit.status,
        trigger: audit.trigger,
        error: audit.error,
        globalScore: audit.global_score,
        domain: site.host,
        siteId: audit.site_id,
        siteUrl: site.url,
        email: user.user?.email ?? null,
        locale,
        notifyAuditEnd: profile?.notify_audit_end !== false,
        priorities: priorityLines(findings ?? [], catalogFor(locale)),
      };
      return record;
    },
    async claim(auditId) {
      const { data, error } = await service.rpc('claim_audit_end_email', {
        p_audit_id: auditId,
      });
      if (error) throw new Error('audit_end_claim');
      return data === true;
    },
    async release(auditId) {
      const { error } = await service.rpc('release_audit_end_email', {
        p_audit_id: auditId,
      });
      if (error) throw new Error('audit_end_release');
    },
    async listRecentPending(now, lookbackMs) {
      const since = new Date(now.getTime() - lookbackMs).toISOString();
      const until = now.toISOString();
      const { data, error } = await service
        .from('audits')
        .select('id')
        .eq('trigger', 'manual')
        .in('status', ['done', 'failed'])
        .is('end_email_sent_at', null)
        .gte('finished_at', since)
        .lte('finished_at', until);
      if (error) throw new Error('audit_end_list_pending');
      return (data ?? []).map((row) => row.id);
    },
  };
}

const catalogCache = new Map<'fr' | 'en', Record<string, string>>();

export function loadFindingCatalog(
  locale: 'fr' | 'en',
): Record<string, string> {
  const hit = catalogCache.get(locale);
  if (hit) return hit;
  try {
    const url = new URL(
      `../../../apps/web/public/dictionnaire-${locale}.json`,
      import.meta.url,
    );
    const parsed = JSON.parse(
      readFileSync(fileURLToPath(url), 'utf8'),
    ) as unknown;
    const bag =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    catalogCache.set(locale, bag);
    return bag;
  } catch {
    catalogCache.set(locale, {});
    return {};
  }
}

export function auditEndEmailFns(
  service: Service,
  env: NodeJS.ProcessEnv,
  logger: Logger,
) {
  const store = supabaseAuditEndStore(service, loadFindingCatalog);
  return {
    notify(auditId: string) {
      return sendAuditEndEmail({ auditId, env, logger, store });
    },
    sweep() {
      return sweepAuditEndEmails({ env, logger, store });
    },
  };
}
