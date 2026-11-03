import {
  ACTION_STATUSES,
  type ActionStatus,
  type Database,
  type Json,
  type PlanChange,
  type PlanItem,
  type PlanMemory,
  type PlanSignal,
  reconcilePlan,
} from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

export type { PlanChange };

interface PlanPort {
  load(auditId: string): Promise<{
    items: PlanItem[];
    signals: PlanSignal[];
    memory: PlanMemory[];
  } | null>;
  apply(change: PlanChange): Promise<void>;
}

/** Applique la règle et garde une trace datée par changement. */
export async function applyPlanSync(
  port: PlanPort,
  auditId: string,
  at: Date,
): Promise<PlanChange[]> {
  const loaded = await port.load(auditId);
  if (!loaded) return [];
  const changes = reconcilePlan(
    loaded.items,
    loaded.signals,
    loaded.memory,
    at,
  );
  for (const change of changes) await port.apply(change);
  return changes;
}

function isStatus(value: string): value is ActionStatus {
  return (ACTION_STATUSES as readonly string[]).includes(value);
}

function memoryFrom(rows: readonly { details: Json }[]): PlanMemory[] {
  const last = new Map<string, 'todo' | 'doing'>();
  for (const row of rows) {
    if (
      !row.details ||
      typeof row.details !== 'object' ||
      Array.isArray(row.details)
    ) {
      continue;
    }
    const details = row.details;
    if (details.reason !== 'corrige') continue;
    const checkId = details.check_id;
    const from = details.from;
    if (typeof checkId !== 'string') continue;
    if (from === 'todo' || from === 'doing') last.set(checkId, from);
  }
  return [...last].map(([checkId, from]) => ({ checkId, from }));
}

/**
 * Lit le plan et les constats, puis écrit `auto_closed` avec le service.
 * Le client ne peut pas poser ce statut (politique RLS).
 */
function supabasePlanPort(service: Client): PlanPort {
  let ownerId = '';
  let siteId = '';
  return {
    async load(auditId) {
      const { data: audit, error } = await service
        .from('audits')
        .select('site_id')
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw new Error('plan_audit');
      if (!audit) return null;
      const { data: site, error: siteError } = await service
        .from('sites')
        .select('owner_id')
        .eq('id', audit.site_id)
        .maybeSingle();
      if (siteError || !site) throw new Error('plan_site');
      ownerId = site.owner_id;
      siteId = audit.site_id;
      const { data: items, error: itemError } = await service
        .from('action_plan_items')
        .select('id, check_id, domain, status')
        .eq('site_id', siteId)
        .eq('user_id', ownerId);
      if (itemError) throw new Error('plan_items');
      const { data: findings, error: findError } = await service
        .from('findings')
        .select('check_id, domain, status')
        .eq('audit_id', auditId);
      if (findError) throw new Error('plan_findings');
      const { data: logs, error: logError } = await service
        .from('audit_log')
        .select('details')
        .eq('action', 'action_plan')
        .eq('actor', ownerId)
        .eq('target', siteId);
      if (logError) throw new Error('plan_trace');
      return {
        items: (items ?? []).flatMap((row) => {
          if (!isStatus(row.status)) return [];
          return [
            {
              id: row.id,
              checkId: row.check_id,
              domain: row.domain,
              status: row.status,
            },
          ];
        }),
        signals: (findings ?? []).map((row) => ({
          checkId: row.check_id,
          domain: row.domain,
          status: row.status,
        })),
        memory: memoryFrom(logs ?? []),
      };
    },
    async apply(change) {
      if (!ownerId || !siteId) throw new Error('plan_contexte');
      const { error } = await service
        .from('action_plan_items')
        .update({ status: change.to, updated_at: change.at })
        .eq('id', change.id);
      if (error) throw new Error('plan_write');
      const { error: logError } = await service.from('audit_log').insert({
        actor: ownerId,
        action: 'action_plan',
        target: siteId,
        at: change.at,
        details: {
          check_id: change.checkId,
          domain: change.domain,
          from: change.from,
          to: change.to,
          reason: change.reason,
          at: change.at,
        },
      });
      if (logError) throw new Error('plan_trace_write');
    },
  };
}

export async function syncAuditPlan(
  service: Client,
  auditId: string,
  at: Date,
): Promise<PlanChange[]> {
  return applyPlanSync(supabasePlanPort(service), auditId, at);
}
