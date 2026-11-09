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

/**
 * Statut montré à un visiteur. Son audit est stocké une fois pour toutes
 * (sessionStorage) et n’est jamais relu : un statut « partial » enregistré ne
 * deviendra jamais « done ». Une fois révélé, il compte donc comme terminé.
 */
export function guestDisplayStatus(status: string, revealed: boolean): string {
  if (revealed) return status === 'partial' ? 'done' : status;
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

interface ProgressDomainInput {
  domain: string;
  score: number | null;
  level: string;
  locked?: boolean;
}

type ProgressChipState = 'done' | 'active' | 'next' | 'wait' | 'off';

interface AuditProgress {
  percent: number;
  finished: boolean;
  failed: boolean;
  poll: boolean;
  domains: { key: string; state: ProgressChipState }[];
}

/** Pastilles de la page, dans l’ordre de la grille. */
const PROGRESS_CHIPS = [
  ['seo', 'seo'],
  ['securite', 'sec'],
  ['ecologie', 'eco'],
  ['dns_email', 'dns'],
  ['performance', 'perf'],
  ['accessibilite', 'a11y'],
  ['qualite', 'code'],
  ['vie_privee', 'rgpd'],
] as const;

function rowLocked(row: ProgressDomainInput | undefined): boolean {
  return row?.locked === true || row?.level === 'locked';
}

function rowScored(row: ProgressDomainInput | undefined): boolean {
  return typeof row?.score === 'number';
}

/**
 * Avancement réel : 100 % seulement quand l’audit est terminé.
 * Un domaine noté est analysé. Un domaine verrouillé ou non mesuré
 * à la fin est « non testé », jamais laissé en cours.
 */
export function auditProgress(input: {
  status: string;
  domains: readonly ProgressDomainInput[];
}): AuditProgress {
  const byName = new Map(input.domains.map((row) => [row.domain, row]));
  const finished = input.status === 'done';
  const failed = input.status === 'failed';
  const terminal = finished || failed;
  const domains = PROGRESS_CHIPS.map(([name, key]) => {
    const row = byName.get(name);
    let state: ProgressChipState = 'wait';
    if (rowLocked(row) || (terminal && !rowScored(row))) state = 'off';
    else if (rowScored(row)) state = 'done';
    return { key, state };
  });
  const measured = PROGRESS_CHIPS.filter(([name]) => {
    const row = byName.get(name);
    if (failed) return rowScored(row);
    return rowScored(row) || rowLocked(row);
  }).length;
  const ratio = Math.round((measured / PROGRESS_CHIPS.length) * 100);
  return {
    percent: finished ? 100 : Math.min(99, ratio),
    finished,
    failed,
    poll: !terminal,
    domains,
  };
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
