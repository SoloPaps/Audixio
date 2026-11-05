const ORIG = '__axOrig';
const DONE = '__axDone';
const SKIP =
  'script,style,textarea,noscript,[data-chrome],[data-i18n-skip],[data-i18n-key]';
// Les attributs (placeholder…) d'un textarea restent traduisibles.
const ATTR_SKIP = SKIP.replace(',textarea', '');

type Marked = Text & { [ORIG]?: string; [DONE]?: string };

let dictionary: Map<string, string> | null = null;
let painting = false;
let watching = false;

function norm(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function englishPack(): Record<string, string> | null {
  const host = globalThis as Record<string, unknown>;
  const slot = host.__audigy_en;
  if (slot && typeof slot === 'object') return slot as Record<string, string>;
  try {
    const raw = localStorage.getItem('audigy-en');
    if (!raw) return null;
    const pack = JSON.parse(raw) as Record<string, string>;
    host.__audigy_en = pack;
    return pack;
  } catch {
    return null;
  }
}

let frenchPack: Record<string, string> | null = null;
let frenchTask: Promise<Record<string, string> | null> | null = null;

function loadFrench(): Promise<Record<string, string> | null> {
  if (frenchPack) return Promise.resolve(frenchPack);
  if (!frenchTask) {
    frenchTask = fetch('/dictionnaire-fr.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((pack: unknown) => {
        if (!pack || typeof pack !== 'object') return null;
        frenchPack = pack as Record<string, string>;
        return frenchPack;
      })
      .catch(() => null);
  }
  return frenchTask;
}

function buildMap(
  pack: Record<string, string>,
  french: Record<string, string>,
): Map<string, string> {
  const next = new Map<string, string>();
  for (const [key, lineFr] of Object.entries(french)) {
    const english = pack[key];
    if (!english || english === lineFr) continue;
    const line = norm(lineFr);
    if (line.length < 2 || /^\d+$/.test(line)) continue;
    if (!next.has(line)) next.set(line, english);
  }
  return next;
}

function translate(original: string, dict: Map<string, string>): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(original);
  if (!match) return original;
  const hit = dict.get(norm(match[2] ?? ''));
  return hit ? `${match[1]}${hit}${match[3]}` : original;
}

function paint(locale: 'fr' | 'en', dict: Map<string, string> | null): void {
  const root = document.body;
  if (!root) return;
  painting = true;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Marked;
    const parent = text.parentElement;
    if (!parent || parent.closest(SKIP)) {
      node = walker.nextNode();
      continue;
    }
    // Un texte changé par le code depuis le dernier passage devient le nouvel original.
    if (text[ORIG] === undefined || text.nodeValue !== text[DONE])
      text[ORIG] = text.nodeValue ?? '';
    const original = text[ORIG] ?? '';
    const next = locale === 'en' && dict ? translate(original, dict) : original;
    if (text.nodeValue !== next) text.nodeValue = next;
    text[DONE] = next;
    node = walker.nextNode();
  }
  const attrs = ['aria-label', 'title', 'placeholder', 'alt'];
  for (const el of root.querySelectorAll<HTMLElement>(
    attrs.map((attr) => `[${attr}]`).join(),
  )) {
    if (el.closest(ATTR_SKIP)) continue;
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      const store = `data-ax-${attr}`;
      const done = `data-ax-done-${attr}`;
      const current = el.getAttribute(attr) ?? '';
      if (
        !el.hasAttribute(store) ||
        (el.hasAttribute(done) && current !== el.getAttribute(done))
      ) {
        if (el.getAttribute(store) !== current) el.setAttribute(store, current);
      }
      const original = el.getAttribute(store) ?? '';
      const next =
        locale === 'en' && dict ? translate(original, dict) : original;
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
      if (el.getAttribute(done) !== next) el.setAttribute(done, next);
    }
  }
  // Bloc traduit d’un seul tenant par sa clé (ordre des mots différent en anglais).
  const pack = locale === 'en' ? englishPack() : null;
  for (const el of root.querySelectorAll<HTMLElement & { [ORIG]?: string }>(
    '[data-i18n-key]',
  )) {
    el[ORIG] ??= el.innerHTML;
    const english = pack?.[el.dataset.i18nKey ?? ''];
    if (english) {
      if (el.textContent !== english) el.textContent = english;
    } else if (el.innerHTML !== el[ORIG]) el.innerHTML = el[ORIG];
  }
  document.documentElement.lang = locale;
  painting = false;
  // Le saut natif vers #ancre se fait avant la traduction : on le refait une fois.
  if (locale === 'en' && !anchored) {
    anchored = true;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
}

let anchored = false;

function storedLocale(): 'fr' | 'en' {
  try {
    return localStorage.getItem('audigy-locale') === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

function watchLocale(): void {
  const root = document.body;
  if (watching || !root) return;
  watching = true;
  new MutationObserver(() => {
    if (!painting && storedLocale() === 'en') applyLocale('en');
  }).observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });
}

export function applyLocale(locale: 'fr' | 'en'): void {
  if (locale === 'fr') {
    paint('fr', null);
    return;
  }
  const pack = englishPack();
  if (!pack) return;
  if (frenchPack) {
    dictionary ??= buildMap(pack, frenchPack);
    paint('en', dictionary);
    return;
  }
  void loadFrench().then((french) => {
    if (!french || !englishPack()) return;
    dictionary ??= buildMap(pack, french);
    paint('en', dictionary);
  });
}

export function bootLocale(): void {
  applyLocale(storedLocale());
  watchLocale();
}
