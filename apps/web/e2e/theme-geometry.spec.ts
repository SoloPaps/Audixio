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

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 800 },
  { name: '330', width: 330, height: 700 },
] as const;

const GROUPS: Record<string, string> = {
  page: 'body',
  nav: 'header.axn, .axn-bar, .canon-bar, nav',
  boutons:
    'button, a.axn-cta, a.btn-primary, a.btn-ghost, a.button, a.b-main, a.canon-login',
  cartes:
    '.card, .dom, .dcard, .chap, .plan, .tile, .panel, .rcard, .note-card, .window, .glass',
  footer: 'footer, .axf',
};

type Box = { x: number; y: number; w: number; h: number };
type Geometry = Record<string, Box[]>;

async function readBoxes(page: Page): Promise<Geometry> {
  return page.evaluate((groups) => {
    (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
      target,
    ) => target;
    const names = Object.keys(groups);
    const out: Record<
      string,
      { x: number; y: number; w: number; h: number }[]
    > = {};
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i] ?? '';
      const nodes = document.querySelectorAll(groups[name] ?? '');
      const boxes: { x: number; y: number; w: number; h: number }[] = [];
      for (let j = 0; j < nodes.length; j += 1) {
        const el = nodes[j];
        if (!(el instanceof Element)) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        boxes.push({
          x: Math.round(rect.x + window.scrollX),
          y: Math.round(rect.y + window.scrollY),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
      out[name] = boxes;
    }
    return out;
  }, GROUPS);
}

async function geometry(page: Page, path: string, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  const response = await page.goto(`${path}?theme=${theme}`, {
    waitUntil: 'domcontentloaded',
  });
  expect(response, path).not.toBeNull();
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none !important;transition:none !important}',
  });
  await page
    .locator('h1')
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => undefined);
  await page
    .waitForFunction(
      () => {
        const node = document.querySelector('[data-mode]');
        return node?.getAttribute('data-mode') !== 'pending';
      },
      null,
      { timeout: 8_000 },
    )
    .catch(() => undefined);
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  let previous = '';
  let current: Geometry = {
    page: [],
    nav: [],
    boutons: [],
    cartes: [],
    footer: [],
  };
  let steady = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      current = await readBoxes(page);
    } catch {
      await page.goto(`${path}?theme=${theme}`, {
        waitUntil: 'domcontentloaded',
      });
      continue;
    }
    const serial = JSON.stringify(current);
    steady = serial === previous ? steady + 1 : 0;
    previous = serial;
    if (steady >= 2) break;
    await page.waitForTimeout(150);
  }
  return current;
}

function mismatches(light: Geometry, dark: Geometry): string[] {
  const lines: string[] = [];
  const names = Object.keys(GROUPS);
  for (const name of names) {
    const left = light[name] ?? [];
    const right = dark[name] ?? [];
    if (left.length !== right.length) {
      lines.push(`${name} : ${left.length} clair, ${right.length} sombre`);
      continue;
    }
    for (let index = 0; index < left.length; index += 1) {
      const a = left[index];
      const b = right[index];
      if (!a || !b) continue;
      const shifted = (['x', 'y', 'w', 'h'] as const).filter(
        (key) => Math.abs(a[key] - b[key]) > 1,
      );
      if (shifted.length > 0) {
        lines.push(
          `${name}[${index}] ${shifted
            .map((key) => `${key} ${a[key]}→${b[key]}`)
            .join(' ')}`,
        );
      }
    }
  }
  return lines;
}

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    test(`géométrie ${viewport.name} ${path}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const light = await geometry(page, path, 'light');
      const dark = await geometry(page, path, 'dark');
      const found = Object.values(light).reduce(
        (sum, boxes) => sum + boxes.length,
        0,
      );
      expect(found, `${path} sans repère`).toBeGreaterThan(0);
      expect(mismatches(light, dark), `${viewport.name} ${path}`).toEqual([]);
    });
  }
}
