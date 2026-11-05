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
