/** Lien du dernier rapport, ou les sites s’il n’y en a pas. */
import { reportHref } from './report-route.js';
export function latestReportHref(id: string | null): string {
  if (!id) return '/sites';
  return reportHref(id);
}

/** Le compte Pro déverrouille les alertes sur mesure. */
export function alertsOpenForPlan(plan: string): boolean {
  return plan === 'pro';
}

/** `1` coche, `0` décoche, sinon la valeur déjà dans la page. */
export function consentChecked(
  stored: string | null,
  fallback: boolean,
): boolean {
  if (stored === '0') return false;
  if (stored === '1') return true;
  return fallback;
}

export function welcomeDone(saved: readonly string[], id: string): boolean {
  return saved.includes(id);
}
