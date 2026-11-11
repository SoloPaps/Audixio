import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Retour owner du 11 nov. (P5) : « je n'aime pas le design de cette note ».
 * Sous le cadran, une seule pastille « lettre + libellé du barème » à la
 * teinte de la lettre, sans icône de statut, lisible en clair et en sombre,
 * identique sur l'accueil, le lien public et le catalogue de composants.
 */

type Rgb = [number, number, number];

function rgb(value: string): Rgb {
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const one = luminance(rgb(a));
  const two = luminance(rgb(b));
  const hi = Math.max(one, two);
  const lo = Math.min(one, two);
  return (hi + 0.05) / (lo + 0.05);
}

async function paint(locator: Locator) {
  return locator.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (n: unknown) => {
        color: string;
        backgroundColor: string;
        stroke: string;
      };
    };
    const style = view.getComputedStyle(node);
    const rect = (
      node as unknown as {
        getBoundingClientRect: () => {
          top: number;
          bottom: number;
          left: number;
          right: number;
          height: number;
        };
      }
    ).getBoundingClientRect();
    return {
      color: style.color,
      background: style.backgroundColor,
      stroke: style.stroke,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      height: rect.height,
    };
  });
}

async function checkPill(
  page: Page,
  gauge: Locator,
  grade: string,
  label: string,
) {
  const status = gauge.locator('.gauge-status');
  // Plus d'icône de statut (triangle, rond…) : une seule pastille.
  await expect(status.locator('svg, .status')).toHaveCount(0);
  await expect(status.locator('.gauge-pill')).toHaveCount(1);
  await expect(status.locator('.gauge-grade')).toHaveText(grade);
  await expect(status.locator('.gauge-word')).toHaveText(label);

  const pill = await paint(status.locator('.gauge-pill'));
  const letter = await paint(status.locator('.gauge-grade'));
  const word = await paint(status.locator('.gauge-word'));
  const fill = await paint(gauge.locator('.gauge-fill'));

  // Lettre et libellé sur une ligne, dans la pastille, centrés ensemble.
  expect(pill.height).toBeLessThan(40);
  const mid = (box: { top: number; bottom: number }) =>
    (box.top + box.bottom) / 2;
  expect(Math.abs(mid(letter) - mid(word))).toBeLessThan(2);
  expect(letter.left).toBeGreaterThanOrEqual(pill.left);
  expect(word.right).toBeLessThanOrEqual(pill.right);
  expect(letter.right).toBeLessThanOrEqual(word.left);

  // Teinte du statut : aplat coloré, même encre que le trait du cadran.
  expect(pill.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(letter.color).toBe(fill.stroke);
  expect(word.color).toBe(fill.stroke);
  // Lisible (AA texte normal) dans les deux thèmes.
  expect(contrast(word.color, pill.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(letter.color, letter.background)).toBeGreaterThanOrEqual(4.5);
  void page;
}

for (const theme of ['light', 'dark'] as const) {
  test(`pastille de note : accueil, lettre + libellé (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/?theme=${theme}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await checkPill(
      page,
      page.locator('.score-slot .gauge'),
      'C',
      'À améliorer',
    );
  });

  test(`pastille de note : toutes les lettres du catalogue (${theme})`, async ({
    page,
  }) => {
    await page.goto(`/dev/composants?theme=${theme}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const cases: [string, string, string][] = [
      ['100', 'A', 'Excellent'],
      ['0', 'F', 'Problème'],
    ];
    for (const [score, grade, label] of cases) {
      await checkPill(
        page,
        page.locator(`.gauge[data-score="${score}"]`).last(),
        grade,
        label,
      );
    }
    // Non testé : même pastille, sans lettre ni aplat coloré.
    const none = page.locator('.gauge[data-score="none"]').last();
    await expect(none.locator('.gauge-status svg')).toHaveCount(0);
    await expect(none.locator('.gauge-word')).toHaveText('Non testé');
  });

  test(`pastille de note : lien public, même composant (${theme})`, async ({
    page,
  }) => {
    await page.goto(`/score/exemple-score-verifie?theme=${theme}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const gauge = page.locator('.gauge').first();
    const grade = (await gauge.getAttribute('data-grade')) ?? '';
    expect(grade).toMatch(/^[A-F]$/);
    await expect(
      gauge.locator('.gauge-status svg, .gauge-status .status'),
    ).toHaveCount(0);
    await expect(gauge.locator('.gauge-pill .gauge-grade')).toHaveText(grade);
  });
}
