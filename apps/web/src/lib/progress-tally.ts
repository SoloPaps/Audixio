/** Compte les pastilles de la page de progression. */
export function progressCountHtml(states: readonly string[]): string {
  let done = 0;
  let active = 0;
  for (const state of states) {
    if (state === 'done') done += 1;
    if (state === 'active') active += 1;
  }
  const waiting = states.length - active - done;
  return `<b>${active} en cours</b> · ${done} terminé${done > 1 ? 's' : ''} · ${waiting} en attente`;
}
