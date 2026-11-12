import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { toEnglish } from './en-session.js';

/* Vérifications communes à toutes les pages (ex theme-contrast, theme-fond-sombre, i18n-balayage). */

export async function contrast(
  page: Page,
  path: string,
  theme: 'light' | 'dark',
) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto(`${path}?theme=${theme}`);
  await page.locator('main, #contenu').first().waitFor({ timeout: 15_000 });
  const heading = page.getByRole('heading').first();
  if (await heading.count()) {
    await heading.waitFor({ timeout: 15_000 }).catch(() => undefined);
  }
  const bar = page.locator('header.axn');
  if ((await bar.count()) > 0 && (await bar.first().isVisible())) {
    await expect(page.locator('.axn-logo img.axn-logo-d')).toBeVisible();
  }
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  expect(
    results.violations,
    `${theme} ${path}\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
}

const session = {
  access_token: 'header.payload.signature',
  expires_at: 2_000_000_000,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ada@exemple.fr',
  },
};

type Paint = { area: number; sample: string };

async function lightPaints(page: Page): Promise<Paint[]> {
  return page.evaluate(() => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
    const view = globalThis as unknown as {
      document: {
        querySelectorAll: (selector: string) => Iterable<{
          tagName: string;
          getBoundingClientRect: () => {
            width: number;
            height: number;
            top: number;
            bottom: number;
          };
        }>;
      };
      getComputedStyle: (node: unknown) => {
        backgroundColor: string;
        backgroundImage: string;
        display: string;
        visibility: string;
        opacity: string;
      };
      innerHeight: number;
    };
    const hex = (value: string): [number, number, number] | null => {
      const raw = value.slice(1);
      const full =
        raw.length === 3
          ? raw
              .split('')
              .map((part) => part + part)
              .join('')
          : raw.slice(0, 6);
      if (full.length < 6) return null;
      return [
        Number.parseInt(full.slice(0, 2), 16),
        Number.parseInt(full.slice(2, 4), 16),
        Number.parseInt(full.slice(4, 6), 16),
      ];
    };
    const light = (sample: string): boolean => {
      for (const item of sample.match(/#[0-9a-fA-F]{3,8}/g) ?? []) {
        const rgb = hex(item);
        if (rgb && rgb[0] >= 220 && rgb[1] >= 220 && rgb[2] >= 220) return true;
      }
      for (const item of sample.matchAll(
        /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g,
      )) {
        const alpha = item[4] === undefined ? 1 : Number(item[4]);
        const red = Number(item[1]);
        const green = Number(item[2]);
        const blue = Number(item[3]);
        if (alpha >= 0.2 && red >= 220 && green >= 220 && blue >= 220)
          return true;
      }
      return false;
    };
    const found: Paint[] = [];
    for (const node of view.document.querySelectorAll('body *')) {
      const box = node.getBoundingClientRect();
      const visible = Math.max(
        0,
        Math.min(box.bottom, view.innerHeight) - Math.max(box.top, 0),
      );
      const area = box.width * visible;
      if (area < 40_000 || box.width < 160) continue;
      const style = view.getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0
      ) {
        continue;
      }
      const sample = `${style.backgroundColor} ${style.backgroundImage}`;
      if (node.tagName === 'IMG' || node.tagName === 'SVG') continue;
      if (light(sample)) found.push({ area: Math.round(area), sample });
    }
    return found;
  });
}

/** Session connectée simulée et base vide, pour le contrôle du fond sombre. */
export async function stubSignedIn(page: Page): Promise<void> {
  await page.route('**://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
}

/** Aucune grande surface claire en thème sombre, connecté. */
export async function darkBackground(page: Page, path: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(`${path}?theme=dark`, { waitUntil: 'domcontentloaded' });
  await page.locator('body').waitFor();
  await page
    .waitForFunction(() => {
      (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
        target,
      ) => target;
      const doc = (
        globalThis as unknown as {
          document: {
            querySelector: (selector: string) => {
              getAttribute: (name: string) => string | null;
              hasAttribute: (name: string) => boolean;
            } | null;
          };
        }
      ).document;
      const mode = doc.querySelector('[data-mode]');
      const main = doc.querySelector('main');
      const pending = mode?.getAttribute('data-mode') === 'pending';
      const hidden = main?.hasAttribute('hidden') === true;
      return !pending && !hidden;
    })
    .catch(() => undefined);
  const paints = await lightPaints(page);
  expect(paints, `${path}\n${JSON.stringify(paints, null, 2)}`).toEqual([]);
}

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

/** En anglais, aucun mot français visible hors liste blanche. */
export async function noFrenchInEnglish(
  page: Page,
  path: string,
): Promise<void> {
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
}

/** Aucun défilement horizontal à 390 px. */
export async function noOverflow390(page: Page, path: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${path}?theme=light`, { waitUntil: 'domcontentloaded' });
  await page.locator('body').waitFor();
  const widths = await page.evaluate(() => {
    const root = (
      globalThis as unknown as {
        document: {
          documentElement: { scrollWidth: number; clientWidth: number };
        };
      }
    ).document.documentElement;
    return { scroll: root.scrollWidth, client: root.clientWidth };
  });
  expect(widths.scroll, `${path} à 390 px`).toBeLessThanOrEqual(widths.client);
}
