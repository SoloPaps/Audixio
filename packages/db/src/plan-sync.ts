import type { ActionStatus } from './droits.js';

/** Constat encore ouvert. `pass` = corrigé. Le reste ne tranche pas. */
const OPEN = new Set(['fail', 'warn']);
const FIXED = new Set(['pass']);

export interface PlanItem {
  id: string;
  checkId: string;
  domain: string;
  status: ActionStatus;
}

export interface PlanSignal {
  checkId: string;
  domain: string;
  status: string;
}

/** Statut d’avant la fermeture automatique, pour rouvrir au même endroit. */
export interface PlanMemory {
  checkId: string;
  from: 'todo' | 'doing';
}

export interface PlanChange {
  id: string;
  checkId: string;
  domain: string;
  from: ActionStatus;
  to: 'auto_closed' | 'todo' | 'doing';
  reason: 'corrige' | 'revenu';
  at: string;
}

/** `ouvert` si un échec ou un avertissement reste. `corrige` seulement si tout passe. */
function verdict(
  signals: readonly PlanSignal[],
  domain: string,
  checkId: string,
): 'ouvert' | 'corrige' | 'silence' {
  let seen = false;
  let open = false;
  let fixed = false;
  for (const signal of signals) {
    if (signal.domain !== domain || signal.checkId !== checkId) continue;
    seen = true;
    if (OPEN.has(signal.status)) open = true;
    else if (FIXED.has(signal.status)) fixed = true;
  }
  if (!seen) return 'silence';
  if (open) return 'ouvert';
  if (fixed) return 'corrige';
  return 'silence';
}

/**
 * Ferme les tâches dont le constat est passé, et rouvre celles
 * qu’un nouvel audit fait revenir. La date est celle de l’audit.
 */
export function reconcilePlan(
  items: readonly PlanItem[],
  signals: readonly PlanSignal[],
  memory: readonly PlanMemory[],
  at: Date,
): PlanChange[] {
  const stamp = at.toISOString();
  const remembered = new Map(memory.map((row) => [row.checkId, row.from]));
  const changes: PlanChange[] = [];
  for (const item of items) {
    const state = verdict(signals, item.domain, item.checkId);
    if (
      state === 'corrige' &&
      (item.status === 'todo' || item.status === 'doing')
    ) {
      changes.push({
        id: item.id,
        checkId: item.checkId,
        domain: item.domain,
        from: item.status,
        to: 'auto_closed',
        reason: 'corrige',
        at: stamp,
      });
      continue;
    }
    if (state === 'ouvert' && item.status === 'auto_closed') {
      changes.push({
        id: item.id,
        checkId: item.checkId,
        domain: item.domain,
        from: 'auto_closed',
        to: remembered.get(item.checkId) ?? 'todo',
        reason: 'revenu',
        at: stamp,
      });
    }
  }
  return changes;
}
