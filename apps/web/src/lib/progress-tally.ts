/** Compte les 8 pastilles. « Non testé » n’est pas « en attente ». */
export function progressCountHtml(states: readonly string[]): string {
  let done = 0;
  let active = 0;
  let waiting = 0;
  let off = 0;
  for (const state of states) {
    if (state === 'active') active += 1;
    else if (state === 'done') done += 1;
    else if (state === 'off') off += 1;
    else waiting += 1;
  }
  const doneWord = done > 1 ? 'terminés' : 'terminé';
  const wait = waiting > 0 ? ` · ${waiting} en attente` : '';
  const untested = off > 0 ? ` · ${off} non testé${off > 1 ? 's' : ''}` : '';
  return `<b>${active} en cours</b> · ${done} ${doneWord}${wait}${untested} · ${states.length} domaines`;
}
