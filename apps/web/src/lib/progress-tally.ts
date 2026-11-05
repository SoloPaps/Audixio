/** Compte les 8 pastilles. « Non testé » n’est pas « en attente ». */
export function progressCountHtml(
  states: readonly string[],
  locale: 'fr' | 'en' = 'fr',
): string {
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
  if (locale === 'en') {
    const waitEn = waiting > 0 ? ` · ${waiting} waiting` : '';
    const offEn = off > 0 ? ` · ${off} not tested` : '';
    return `<b>${active} in progress</b> · ${done} done${waitEn}${offEn} · ${states.length} domains`;
  }
  const doneWord = done > 1 ? 'terminés' : 'terminé';
  const wait = waiting > 0 ? ` · ${waiting} en attente` : '';
  const untested = off > 0 ? ` · ${off} non testé${off > 1 ? 's' : ''}` : '';
  return `<b>${active} en cours</b> · ${done} ${doneWord}${wait}${untested} · ${states.length} domaines`;
}
