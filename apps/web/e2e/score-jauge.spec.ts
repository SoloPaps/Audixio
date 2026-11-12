import { expect, type Locator, type Page, test } from '@playwright/test';

/** Vue du navigateur, sans le DOM de TypeScript. */
type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
};

/**
 * Refonte du cadran du score (owner, 6 nov.) : nombre ET lettre, dans les
 * deux thèmes, sans collision avec l’anneau de la maquette d’accueil.
 */

const THEMES = ['light', 'dark'] as const;

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('élément invisible');
  return rect;
}

function inside(
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number },
) {
  return (
    inner.x >= outer.x - 1 &&
    inner.y >= outer.y - 1 &&
    inner.x + inner.width <= outer.x + outer.width + 1 &&
    inner.y + inner.height <= outer.y + outer.height + 1
  );
}

async function opaque(locator: Locator) {
  return locator.evaluate(
    (node) =>
      (globalThis as unknown as View).getComputedStyle(node).backgroundColor,
  );
}

async function checkGauge(
  page: Page,
  gauge: Locator,
  score: string,
  grade: string,
) {
  await expect(gauge).toHaveAttribute('data-grade', grade);
  await expect(gauge.locator('.score-num')).toHaveText(score);
  await expect(gauge.locator('.score-denom')).toHaveText('/100');
  await expect(gauge.locator('.gauge-grade')).toHaveText(grade);
  // Anneau complet + bandes du barème, lettre courante surlignée.
  await expect(gauge.locator('.gauge-band')).toHaveCount(6);
  await expect(
    gauge.locator(`.gauge-band.on[data-band="${grade}"]`),
  ).toHaveCount(1);
  // Le nombre tient dans l’anneau ; la ligne lettre + statut est sous l’anneau.
  const ring = await box(gauge.locator('.gauge-figure > svg'));
  const num = await box(gauge.locator('.gauge-hole'));
  expect(inside(num, ring)).toBe(true);
  const status = await box(gauge.locator('.gauge-status'));
  expect(status.y).toBeGreaterThanOrEqual(ring.y + ring.height - 1);
  // La pastille de lettre garde un fond, même en sombre.
  expect(await opaque(gauge.locator('.gauge-grade'))).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  const fill = await gauge
    .locator('.gauge-fill')
    .evaluate(
      (node) => (globalThis as unknown as View).getComputedStyle(node).stroke,
    );
  const ink = await gauge
    .locator('.gauge-grade')
    .evaluate(
      (node) => (globalThis as unknown as View).getComputedStyle(node).color,
    );
  expect(fill).toBe(ink);
  await expect(gauge.locator('.gauge-tip')).toHaveCount(0);
  void page;
}

/** Angle du bout du trait (atan2, 0 à droite, sens horaire en Y vers le bas). */
async function fillEndAngle(gauge: Locator): Promise<number> {
  return gauge.locator('.gauge-fill').evaluate((node) => {
    const path = node as unknown as {
      getTotalLength: () => number;
      getPointAtLength: (n: number) => { x: number; y: number };
      getAttribute: (name: string) => string | null;
      ownerSVGElement: { getAttribute: (name: string) => string | null } | null;
    };
    const filled = Number(
      (path.getAttribute('stroke-dasharray') ?? '0').split(/[\s,]+/)[0],
    );
    const len = path.getTotalLength();
    const pt = path.getPointAtLength((filled / 100) * len);
    const svg = path.ownerSVGElement;
    const cx = Number(svg?.getAttribute('data-cx') ?? 100);
    const cy = Number(svg?.getAttribute('data-cy') ?? 100);
    return (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI;
  });
}

function expectedEndAngle(score: number): number {
  return -90 + (score / 100) * 360;
}

function angleGap(a: number, b: number): number {
  const delta = ((a - b + 540) % 360) - 180;
  return Math.abs(delta);
}

for (const theme of THEMES) {
  test(`cadran : nombre et lettre, note moyenne (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/dev/composants?theme=${theme}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const gauge = page.locator('.gauge-mid .gauge');
    await expect(gauge).toHaveAttribute('role', 'img');
    await expect(gauge).toHaveAttribute('aria-label', /66 sur 100, note C/);
    await checkGauge(page, gauge, '66', 'C');
    // Plus de collision avec l’anneau .gauge-wrap de la maquette (132 px).
    const svg = await gauge.locator('.gauge-figure > svg').evaluate((node) => ({
      transform: (globalThis as unknown as View).getComputedStyle(node)
        .transform,
      height: node.getBoundingClientRect().height,
      width: node.getBoundingClientRect().width,
    }));
    expect(svg.transform).toBe('none');
    expect(Math.abs(svg.height / svg.width - 1)).toBeLessThan(0.05);
  });

  test(`cadran : héros et cas limites (${theme})`, async ({ page }) => {
    await page.goto(`/dev/composants?theme=${theme}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await checkGauge(
      page,
      page.locator('.gauge[data-score="0"]').last(),
      '0',
      'F',
    );
    await checkGauge(
      page,
      page.locator('.gauge[data-score="100"]').last(),
      '100',
      'A',
    );
    const none = page.locator('.gauge[data-score="none"]').last();
    await expect(none).toHaveAttribute('data-grade', 'none');
    await expect(none.locator('.gauge-grade')).toHaveCount(0);
    await expect(none.locator('.gauge-tip')).toHaveCount(0);
  });
}

test('cadran : l’arc de 66 et de 100 suit le score, sans point parasite', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dev/composants?theme=light');
  const home = page.locator('.gauge-mid .gauge');
  await expect(home).toHaveAttribute('data-score', '66');
  await expect(home.locator('.gauge-fill')).toHaveAttribute(
    'stroke-dasharray',
    '66 34',
  );
  expect(angleGap(await fillEndAngle(home), expectedEndAngle(66))).toBeLessThan(
    3,
  );
  await expect(home.locator('.gauge-tip')).toHaveCount(0);

  await page.goto('/dev/composants?theme=light');
  const full = page.locator('.gauge[data-score="100"]').last();
  await expect(full.locator('.gauge-fill')).toHaveAttribute(
    'stroke-dasharray',
    '100 0',
  );
  const zero = page.locator('.gauge[data-score="0"]').last();
  await expect(zero.locator('.gauge-fill')).toHaveAttribute(
    'stroke-dasharray',
    '0 100',
  );
  await expect(page.locator('.gauge-tip')).toHaveCount(0);
});

test('cadran : la lettre change de teinte entre clair et sombre', async ({
  page,
}) => {
  await page.goto('/dev/composants?theme=light');
  const chip = page.locator('.gauge-mid .gauge-grade');
  const light = await opaque(chip);
  await page.goto('/dev/composants?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const dark = await opaque(page.locator('.gauge-mid .gauge-grade'));
  expect(dark).not.toBe(light);
});

/**
 * Poids des pages : les six bandes reprennent un
 * seul tracé (<use>), sans classes de portée répétées, et restent dessinées.
 */
for (const theme of THEMES) {
  test(`cadran léger, bandes depuis un seul tracé (${theme})`, async ({
    page,
  }) => {
    await page.goto(`/dev/composants?theme=${theme}`);
    const gauge = page.locator('.gauge-mid .gauge');
    await expect(gauge.locator('defs path')).toHaveCount(1);
    await expect(gauge.locator('use.gauge-band')).toHaveCount(6);
    // HTML rendu par le serveur : un cadran pèse moins de 2 000 octets.
    // Le banc /dev n’est pas publié (dropDevPages) : on lit la réponse
    // d’astro dev, ramenée au HTML construit (sans attributs de source ni
    // classes de portée Svelte, que seul le mode dev ajoute).
    const res = await page.request.get('/dev/composants');
    expect(res.ok()).toBe(true);
    const built = (await res.text())
      .replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, '')
      .replace(/ class="svelte-[a-z0-9]+"/g, '')
      .replace(/ svelte-[a-z0-9]+(?=[\s"])/g, '');
    const from = built.indexOf(
      '<div class="gauge',
      built.indexOf('class="gauge-mid"') + 17,
    );
    const to = built.indexOf('<div class="gauge-status', from);
    expect(from).toBeGreaterThan(-1);
    expect(to - from).toBeLessThan(2000);
    const strokes = await gauge.locator('.gauge-band').evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = (
          node as unknown as {
            getBoundingClientRect: () => { width: number; height: number };
          }
        ).getBoundingClientRect();
        return {
          on: (
            node as unknown as {
              classList: { contains: (c: string) => boolean };
            }
          ).classList.contains('on'),
          stroke: (globalThis as unknown as View).getComputedStyle(node).stroke,
          drawn: rect.width > 0 && rect.height > 0,
        };
      }),
    );
    expect(strokes.every((band) => band.drawn)).toBe(true);
    const ink = await gauge
      .locator('.gauge-grade')
      .evaluate(
        (node) => (globalThis as unknown as View).getComputedStyle(node).color,
      );
    expect(
      strokes.filter((band) => band.on).map((band) => band.stroke),
    ).toEqual([ink]);
    expect(strokes.find((band) => !band.on)?.stroke).not.toBe(ink);
  });
}
