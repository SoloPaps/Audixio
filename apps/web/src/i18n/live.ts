import { fr } from './fr.js';

const ORIG = '__axOrig';
const SKIP =
  'script, style, textarea, noscript, [data-chrome], [data-i18n-skip]';

type Marked = Text & { [ORIG]?: string };

let dictionary: Map<string, string> | null = null;

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

function buildMap(pack: Record<string, string>): Map<string, string> {
  const next = new Map<string, string>();
  for (const [key, french] of Object.entries(fr)) {
    const english = pack[key];
    if (!english || english === french) continue;
    const line = norm(french);
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
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Marked;
    const parent = text.parentElement;
    if (!parent || parent.closest(SKIP)) {
      node = walker.nextNode();
      continue;
    }
    if (text[ORIG] === undefined) text[ORIG] = text.nodeValue ?? '';
    const original = text[ORIG] ?? '';
    const next = locale === 'en' && dict ? translate(original, dict) : original;
    if (text.nodeValue !== next) text.nodeValue = next;
    node = walker.nextNode();
  }
  for (const el of root.querySelectorAll<HTMLElement>(
    '[aria-label], [title], [placeholder], [alt]',
  )) {
    if (el.closest(SKIP)) continue;
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
      if (!el.hasAttribute(attr)) continue;
      const store = `data-ax-${attr}`;
      if (!el.hasAttribute(store))
        el.setAttribute(store, el.getAttribute(attr) ?? '');
      const original = el.getAttribute(store) ?? '';
      const next =
        locale === 'en' && dict ? translate(original, dict) : original;
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
  }
  document.documentElement.lang = locale;
}

export function applyLocale(locale: 'fr' | 'en'): void {
  if (locale === 'fr') {
    paint('fr', null);
    return;
  }
  const pack = englishPack();
  if (!pack) return;
  dictionary ??= buildMap(pack);
  paint('en', dictionary);
}

export function bootLocale(): void {
  let locale: 'fr' | 'en' = 'fr';
  try {
    if (localStorage.getItem('audigy-locale') === 'en') locale = 'en';
  } catch {
    locale = 'fr';
  }
  applyLocale(locale);
}
