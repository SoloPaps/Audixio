const ORIG = '__axOrig';
const DONE = '__axDone';
const SKIP =
  'script,style,textarea,noscript,[data-chrome],[data-i18n-skip],[data-i18n-key]';
// Les attributs (placeholder…) d'un textarea restent traduisibles.
const ATTR_SKIP = SKIP.replace(',textarea', '');

const TEXT_ATTRS = ['aria-label', 'title', 'placeholder', 'alt'] as const;

type Marked = Text & { [ORIG]?: string; [DONE]?: string };

let dictionary: Map<string, string> | null = null;
let titleOriginal: string | null = null;
let titleDone: string | null = null;
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

function parsePack(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const pack = JSON.parse(raw) as unknown;
    return pack && typeof pack === 'object'
      ? (pack as Record<string, string>)
      : null;
  } catch {
    return null;
  }
}

/** Copie posée au choix de l’anglais : la page se traduit sans attendre le réseau. */
function cachedFrench(): Record<string, string> | null {
  try {
    return parsePack(localStorage.getItem('audigy-fr'));
  } catch {
    return null;
  }
}

function loadFrench(): Promise<Record<string, string> | null> {
  if (!frenchTask) {
    frenchTask = fetch('/dictionnaire-fr.json')
      .then((res) => (res.ok ? res.text() : null))
      .then((raw) => {
        const pack = parsePack(raw);
        if (!pack || raw === null) return null;
        try {
          if (localStorage.getItem('audigy-fr') !== null)
            localStorage.setItem('audigy-fr', raw);
        } catch {
          // Copie locale facultative.
        }
        return pack;
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

function storedAttr(el: Element, attr: string, current: string): string {
  const store = `data-ax-${attr}`;
  const done = `data-ax-done-${attr}`;
  if (
    !el.hasAttribute(store) ||
    (el.hasAttribute(done) && current !== el.getAttribute(done))
  ) {
    if (el.getAttribute(store) !== current) el.setAttribute(store, current);
  }
  return el.getAttribute(store) ?? '';
}

function paintMeta(
  selector: string,
  attr: string,
  locale: 'fr' | 'en',
  dict: Map<string, string> | null,
): void {
  if (typeof document.querySelector !== 'function') return;
  const el = document.querySelector(selector);
  if (!el) return;
  const current = el.getAttribute(attr) ?? '';
  const original = storedAttr(el, attr, current);
  const next = locale === 'en' && dict ? translate(original, dict) : original;
  if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
  const done = `data-ax-done-${attr}`;
  if (el.getAttribute(done) !== next) el.setAttribute(done, next);
}

function paintLocale(locale: 'fr' | 'en'): void {
  if (typeof document.querySelector !== 'function') return;
  const og = document.querySelector('meta[property="og:locale"]');
  if (!og) return;
  const next = locale === 'en' ? 'en_US' : 'fr_FR';
  if (og.getAttribute('content') !== next) og.setAttribute('content', next);
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
  const attrs = TEXT_ATTRS;
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
  // Titre d’onglet : traduit comme un texte, l’original FR reste gardé.
  if (titleOriginal === null || document.title !== titleDone)
    titleOriginal = document.title;
  const title =
    locale === 'en' && dict ? translate(titleOriginal, dict) : titleOriginal;
  if (document.title !== title) document.title = title;
  titleDone = title;
  document.documentElement.lang = locale;
  paintMeta('meta[name="description"]', 'content', locale, dict);
  paintMeta('meta[property="og:description"]', 'content', locale, dict);
  paintLocale(locale);
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

function insideSkip(record: MutationRecord): boolean {
  const node = record.target;
  const el = node instanceof Element ? node : node.parentElement;
  return el?.closest('[data-i18n-skip]') != null;
}

function watchLocale(): void {
  const root = document.body;
  if (watching || !root) return;
  watching = true;
  new MutationObserver((records) => {
    if (painting || storedLocale() !== 'en') return;
    // Un compteur animé (marqué data-i18n-skip) ne relance pas la traduction.
    if (records.every(insideSkip)) return;
    applyLocale('en');
  }).observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    // Classes et styles changent à chaque image d’une animation : seuls les textes comptent.
    attributeFilter: [...TEXT_ATTRS],
  });
}

let frenchFresh = false;

export function applyLocale(locale: 'fr' | 'en'): void {
  if (locale === 'fr') {
    paint('fr', null);
    return;
  }
  const pack = englishPack();
  if (!pack) return;
  frenchPack ??= cachedFrench();
  if (frenchPack) {
    dictionary ??= buildMap(pack, frenchPack);
    paint('en', dictionary);
    if (frenchFresh) return;
  }
  // Le dictionnaire du réseau fait foi : la copie locale peut dater d’un ancien déploiement.
  void loadFrench().then((french) => {
    if (!french || !englishPack() || frenchFresh) return;
    frenchFresh = true;
    frenchPack = french;
    dictionary = buildMap(pack, french);
    if (storedLocale() === 'en') paint('en', dictionary);
  });
}

export function bootLocale(): void {
  applyLocale(storedLocale());
  watchLocale();
}
