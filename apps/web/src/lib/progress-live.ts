import { t } from '../i18n/index.js';
import { tReport } from '../i18n/report-fr.js';

/**
 * Premier écran invité : l’audit est déjà en mémoire, on montre quand même
 * l’analyse avant le statut stocké. Aucune écriture, aucun appel réseau.
 */
const GUEST_PHASES = ['phase.dns', 'phase.pages', 'phase.privacy'] as const;

/** Phases montrées pendant le court passage invité, avant le statut stocké. */
export function guestBeatPhase(step: number): string {
  const index = Math.max(0, Math.min(step, GUEST_PHASES.length - 1));
  return tReport(GUEST_PHASES[index] ?? 'phase.dns');
}

/** Vrai si aucun domaine n’a de note numérique. Une note 0 mesurée reste une note. */
export function nothingMeasured(
  domains: readonly { score: number | null }[],
): boolean {
  return !domains.some((domain) => typeof domain.score === 'number');
}

export function guestDisplayStatus(status: string, revealed: boolean): string {
  if (revealed) return status;
  if (status === 'done' || status === 'partial' || status === 'failed') {
    return 'running';
  }
  return status;
}

export function progressLive(
  status: string,
  finishedNames: readonly string[],
): string {
  if (status === 'done') return t('progress.ready');
  if (status === 'failed') return t('progress.failed');
  if (status === 'partial') return t('progress.partial');
  const last = finishedNames[finishedNames.length - 1];
  if (last) return last;
  return t('progress.live');
}

/** Phrase visible quand les checks navigateur n’ont pas tourné. */
export function runnerGap(
  findings: readonly { reason: string | null }[],
): string | null {
  if (findings.some((item) => item.reason === 'reason.runner_absent')) {
    return t('reason.runner_absent');
  }
  if (findings.some((item) => item.reason === 'reason.browser_skipped')) {
    return t('reason.browser_skipped');
  }
  return null;
}

/** Fourchette grossière, pas un minuteur. */
export function progressEta(status: string, scored: number): string | null {
  if (status === 'done' || status === 'failed') return null;
  if (status === 'partial' || scored >= 4) return tReport('eta.short');
  if (scored >= 1) return tReport('eta.mid');
  return tReport('eta.long');
}

/** Phase nommée : file, DNS, pages, vie privée, fin. */
export function progressPhase(
  status: string,
  scored: number,
  privacyScored: boolean,
): string | null {
  if (status === 'done' || status === 'failed') return null;
  if (status === 'queued') return tReport('phase.queue');
  if (privacyScored) return tReport('phase.tail');
  if (scored === 0) return tReport('phase.dns');
  if (scored < 4) return tReport('phase.pages');
  return tReport('phase.privacy');
}
