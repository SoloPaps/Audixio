import type { ActionStatus, SeverityTone } from './hub-view.js';

/** 1 = faible, 2 = moyen, 3 = important. 20 min et moins = faible. */
export function effortBand(minutes: number | null | undefined): 1 | 2 | 3 {
  if (minutes === null || minutes === undefined || minutes <= 0) return 2;
  if (minutes <= 20) return 1;
  if (minutes <= 60) return 2;
  return 3;
}

export type Quadrant = 0 | 1 | 2 | 3;

/** Quadrant hors tâches déjà faites : 0 gains rapides, 1 chantiers, 2 retouches, 3 plus tard. */
export function quadrant(
  impact: number,
  effort: 1 | 2 | 3,
  status: ActionStatus,
): Quadrant | null {
  if (status === 'done') return null;
  const heavy = impact >= 2;
  const light = effort <= 1;
  if (heavy && light) return 0;
  if (heavy) return 1;
  if (light) return 2;
  return 3;
}

const TONE_RANK: Record<SeverityTone, number> = {
  crit: 0,
  fix: 1,
  check: 2,
  minor: 3,
};

export interface TaskSort {
  tone: SeverityTone;
  impact: number;
  effort: 1 | 2 | 3;
}

export function compareTasks(
  sort: 'prio' | 'eff',
  a: TaskSort,
  b: TaskSort,
): number {
  if (sort === 'eff') {
    return a.effort - b.effort || b.impact - a.impact;
  }
  return TONE_RANK[a.tone] - TONE_RANK[b.tone] || b.impact - a.impact;
}

const SENSITIVE = new Set(['securite', 'vie_privee', 'dns_email']);

/** Détail exploitable : jamais sur un domaine verrouillé ni sur un sensible non vérifié. */
export function detailAllowed(
  domain: string,
  locked: boolean,
  verified: boolean,
): boolean {
  if (locked) return false;
  if (!verified && SENSITIVE.has(domain)) return false;
  return true;
}
