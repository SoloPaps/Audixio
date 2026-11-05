/** Dictionnaire anglais utilisable pour la page mot de passe. */

export function enPackUsable(pack: unknown): pack is Record<string, string> {
  if (!pack || typeof pack !== 'object') return false;
  const bag = pack as Record<string, unknown>;
  const password = bag['login.password'];
  const submit = bag['login.submit'];
  const lead = bag['login.lead'];
  if (typeof password !== 'string' || password.length === 0) return false;
  if (typeof submit !== 'string' || submit.length === 0) return false;
  if (submit === 'Send the link') return false;
  if (typeof lead === 'string' && lead.toLowerCase().includes('no password')) {
    return false;
  }
  return true;
}

/** Garde aussi le dictionnaire français : la page rechargée se traduit sans attendre le réseau. */
async function storeFrenchDictionary(stamp: number): Promise<void> {
  try {
    const res = await fetch(`/dictionnaire-fr.json?t=${stamp}`);
    if (!res.ok) return;
    const text = await res.text();
    const pack = JSON.parse(text) as unknown;
    if (!pack || typeof pack !== 'object') return;
    localStorage.setItem('audigy-fr', text);
  } catch {
    // Sans copie locale, la traduction attend le dictionnaire du réseau.
  }
}

/** Remplace le cache. Un ancien lien magique ne reste pas en mémoire. */
export async function storeEnglishDictionary(): Promise<boolean> {
  const stamp = Date.now();
  const french = storeFrenchDictionary(stamp);
  const res = await fetch(`/dictionnaire-en.json?t=${stamp}`);
  await french;
  if (!res.ok) return false;
  const text = await res.text();
  let pack: unknown;
  try {
    pack = JSON.parse(text) as unknown;
  } catch {
    return false;
  }
  if (!enPackUsable(pack)) return false;
  localStorage.setItem('audigy-en', text);
  return true;
}

const PENDING = 'audigy-locale-pending';

/**
 * Note le choix de langue avant le téléchargement du dictionnaire (300 Ko) :
 * quitter la page pendant l’attente ne perd plus le choix de l’anglais.
 */
export function rememberLocaleChoice(next: 'fr' | 'en'): void {
  try {
    if (next === 'en') localStorage.setItem(PENDING, 'en');
    else localStorage.removeItem(PENDING);
  } catch {
    // Stockage indisponible : le choix vaut pour cette page seulement.
  }
}

/** Le choix est posé : plus rien en attente. */
export function settleLocaleChoice(): void {
  try {
    localStorage.removeItem(PENDING);
  } catch {
    // Stockage indisponible.
  }
}

/**
 * Reprend un passage à l’anglais interrompu par une navigation.
 * Vrai quand l’anglais vient d’être posé : la page doit se recharger.
 */
export async function resumeEnglishChoice(): Promise<boolean> {
  try {
    if (localStorage.getItem(PENDING) !== 'en') return false;
    if (localStorage.getItem('audigy-locale') === 'en') {
      settleLocaleChoice();
      return false;
    }
    const stored = await storeEnglishDictionary();
    settleLocaleChoice();
    if (!stored) return false;
    localStorage.setItem('audigy-locale', 'en');
    return true;
  } catch {
    return false;
  }
}
