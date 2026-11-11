/**
 * Copie dans le presse-papiers, honnête : `true` seulement si le texte est
 * vraiment copié. L'API asynchrone d'abord ; sinon (page servie en http sur
 * une adresse locale du réseau, refus du navigateur, API absente) un repli
 * par zone de texte et `execCommand('copy')`, encore accepté pendant le clic.
 */
export async function copyText(text: string): Promise<boolean> {
  const clip = globalThis.navigator?.clipboard;
  if (clip?.writeText) {
    try {
      await clip.writeText(text);
      return true;
    } catch {
      // Refus ou contexte non sécurisé : on tente le repli.
    }
  }
  return legacyCopy(text);
}

/** Repli sans API : zone de texte invisible, sélection, copie, nettoyage. */
export function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none';
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  if (typeof active?.focus === 'function')
    active.focus({ preventScroll: true });
  return ok;
}
