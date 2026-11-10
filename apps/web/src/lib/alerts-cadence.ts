import { t } from '../i18n/index.js';

const CADENCE_KEYS = {
  daily: 'mq.ui.cadence.daily',
  weekly: 'mq.ui.cadence.weekly',
  monthly: 'mq.ui.cadence.monthly',
} as const;

export type AlertCadence = keyof typeof CADENCE_KEYS;

export function cadenceSummaryKey(
  cadence: string,
): (typeof CADENCE_KEYS)[AlertCadence] | null {
  if (cadence === 'daily' || cadence === 'weekly' || cadence === 'monthly') {
    return CADENCE_KEYS[cadence];
  }
  return null;
}

/** Résumé de cadence dans le bandeau d’alertes, y compris mensuelle. */
export function applyCadenceSummary(
  node: { textContent: string | null } | null,
  cadence: string,
): void {
  const key = cadenceSummaryKey(cadence);
  if (!node || !key) return;
  node.textContent = t(key);
}
