import { expect, type Page, test } from '@playwright/test';

const PAGES = [
  '/',
  '/methode',
  '/sites',
  '/exemple-rapport',
  '/rapport',
  '/demande-acces',
  '/pro',
  '/confidentialite',
  '/cgu',
  '/ecoconception',
  '/connexion',
  '/inscription',
  '/mentions-legales',
  '/accessibilite',
  '/cookies',
  '/robot',
  '/audit-echoue',
  '/progression',
  '/compte',
  '/bienvenue',
  '/verifier',
  '/badge',
  '/brief',
  '/compte/alertes',
  '/constat',
  '/domaine',
  '/email-confirme',
  '/historique',
  '/maintenance',
  '/partage',
  '/passer-pro',
  '/plan',
  '/rapport/imprimer',
  '/reinitialisation',
  '/score',
  '/404',
  '/500',
  '/score/exemple-score',
  `/partage/${'ab'.repeat(16)}`,
  '/verifier/00000000-0000-4000-8000-000000000019',
] as const;

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

test.beforeEach(async ({ page }) => {
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
});

for (const path of PAGES) {
  test(`fond sombre ${path}`, async ({ page }) => {
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
  });
}
