import { expect, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

const PAGES = [
  '/',
  '/methode',
  '/exemple-rapport',
  '/pro',
  '/cgu',
  '/confidentialite',
  '/mentions-legales',
  '/accessibilite',
  '/ecoconception',
  '/robot',
  '/audit-echoue',
  '/progression',
  '/reinitialisation',
  '/email-confirme',
  '/bienvenue',
  '/partage',
  '/passer-pro',
  '/score',
];

/** Accents français encore visibles en EN, hors noms propres et sélecteur. */
const FR_MARK =
  /[àâäéèêëïîôùûüçœæ]|Sécurité|Écologie|Qualité technique|Vie privée/;

const ALLOW = [
  /FR — Français/,
  /Français/,
  /Defender of Rights \(Défenseur des droits\)/,
  /Freepost \(Libre réponse 71120\)/,
  /exemple\.fr/,
  /audixio\.fr/,
  /I don’t know/,
  /don’t/,
];

function allowed(text: string): boolean {
  const line = text.trim();
  if (!line) return true;
  return ALLOW.some((re) => re.test(line));
}

const VISIBLE_BITS = `(() => {
  const skip = 'script,style,noscript,code,pre,[data-i18n-skip]';
  const attrs = ['aria-label', 'title', 'alt', 'placeholder'];
  const out = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
  );
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest(skip)) {
      const style = getComputedStyle(parent);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        const text = (node.nodeValue || '').replace(/\\s+/g, ' ').trim();
        if (text.length > 1) out.push(text);
      }
    }
    node = walker.nextNode();
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest(skip)) continue;
    for (const name of attrs) {
      const value = el.getAttribute(name);
      if (value && value.trim().length > 1) out.push(value.trim());
    }
  }
  out.push(document.title);
  return out;
})()`;

async function visibleBits(page: Page): Promise<string[]> {
  return page.evaluate(VISIBLE_BITS) as Promise<string[]>;
}

test.describe('balayage EN : pas de mot français visible', () => {
  for (const path of PAGES) {
    test(`${path} en anglais ne laisse pas de français hors liste blanche`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${path}?theme=light`);
      await toEnglish(page);
      await page.waitForLoadState('domcontentloaded');
      let bits: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        try {
          bits = await visibleBits(page);
          break;
        } catch {
          await page.waitForTimeout(200);
        }
      }
      const leaks = bits.filter((line) => FR_MARK.test(line) && !allowed(line));
      expect(leaks, leaks.join(' | ')).toEqual([]);
    });
  }
});
