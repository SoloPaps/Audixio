import { expect, type Locator, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

/**
 * Retour owner du 11 nov. (P6) : « en lien public certaines choses ne sont
 * pas designées ». Les sections du bas (Détail de la protection, Propriétaire
 * de ce site, Vérification) reprennent le design du rapport juste au-dessus :
 * même colonne, mêmes cartes que les domaines, boutons du rapport, mentions
 * en accordéon. Site vérifié et non vérifié, clair et sombre.
 */

const PAGES = [
  ['vérifié', '/score/exemple-score-verifie'],
  ['non vérifié', '/score/exemple-score'],
] as const;

async function look(locator: Locator) {
  return locator.evaluate((node) => {
    const view = globalThis as unknown as {
      getComputedStyle: (n: unknown, pseudo?: string) => Record<string, string>;
    };
    const style = view.getComputedStyle(node);
    const rect = (
      node as unknown as {
        getBoundingClientRect: () => {
          left: number;
          width: number;
          height: number;
        };
      }
    ).getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: rect.height,
      radius: style.borderTopLeftRadius,
      background: style.backgroundColor,
      border: style.borderTopColor,
      borderWidth: style.borderTopWidth,
      shadow: style.boxShadow,
      listStyle: style.listStyleType,
      display: style.display,
      font: style.fontFamily,
    };
  });
}

async function checkSections(page: Page, titles: string[]) {
  const domain = await look(page.locator('.public-hub .dom').first());
  const report = await look(page.locator('.public-hub .sec-h h2').first());
  for (const title of titles) {
    const heading = page.getByRole('heading', {
      level: 2,
      name: title,
      exact: true,
    });
    await expect(heading).toBeVisible();
    // Titre de section du rapport, même alignement que « Les 8 domaines ».
    const section = page.locator('.pub-more section', { has: heading });
    await expect(section.locator('.sec-h h2')).toHaveText(title);
    const head = await look(heading);
    expect(head.left).toBe(report.left);
    // Carte du rapport : même colonne, coins, fond, bord et ombre que .dom.
    const card = await look(section.locator('.pub-card'));
    expect(card.left).toBe(domain.left);
    expect(card.width).toBe(domain.width);
    expect(card.radius).toBe(domain.radius);
    expect(card.background).toBe(domain.background);
    expect(card.border).toBe(domain.border);
    expect(card.shadow).toBe(domain.shadow);
  }
}

for (const theme of ['light', 'dark'] as const) {
  for (const [kind, url] of PAGES) {
    test(`lien public ${kind} : sections du bas au design du rapport (${theme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${url}?theme=${theme}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await checkSections(page, [
        'Détail de la protection',
        'Propriétaire de ce site',
        'Vérification',
      ]);

      // Boutons du rapport (.btn), pas de lien nu ni de pilule d'un autre style.
      const ghost = await look(page.locator('.public-hub .btn-ghost').first());
      for (const name of [
        'Télécharger le badge',
        'Télécharger en Markdown',
        'Gérer ce site',
      ]) {
        const control = page
          .locator('.pub-more')
          .getByRole(name === 'Télécharger le badge' ? 'button' : 'link', {
            name,
            exact: true,
          });
        await expect(control).toHaveClass(/\bbtn\b/);
        const box = await look(control);
        expect(box.radius).toBe(ghost.radius);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const verify = page
        .locator('.pub-more')
        .getByRole('link', { name: 'Vérifier ce rapport' });
      expect((await look(verify)).radius).toBe(ghost.radius);

      // Empreinte : pastilles bordées, pas de lignes mono nues.
      const meta = page.locator('.pub-more .report-footer p:not(:last-child)');
      await expect(meta).toHaveCount(4);
      for (const chip of await meta.all()) {
        const box = await look(chip);
        expect(box.borderWidth).toBe('1px');
        expect(box.radius).not.toBe('0px');
      }

      // Mentions : accordéon bordé, sans triangle natif, qui s'ouvre.
      const details = page.locator('.pub-more details.preuve-mentions');
      expect((await look(details)).borderWidth).toBe('1px');
      const summary = details.locator('summary');
      const marker = await look(summary);
      expect(marker.listStyle).toBe('none');
      expect(marker.height).toBeGreaterThanOrEqual(44);
      await summary.click();
      await expect(details).toHaveAttribute('open', '');
      await expect(details.locator('.prose').first()).toBeVisible();

      // Plus de trait orphelin sous le verdict.
      const verdict = await look(page.locator('.verdict'));
      expect(verdict.borderWidth).toBe('0px');
    });
  }
}

test('lien public EN : les sections suivent le catalogue anglais', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/score/exemple-score-verifie?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await checkSections(page, [
    'Protection detail',
    'Site owner',
    'Verification',
  ]);
});

test('lien public 390 px : cartes sans débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/score/exemple-score-verifie?theme=dark');
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const card of await page.locator('.pub-more .pub-card').all()) {
    const box = await card.boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 999)).toBeLessThanOrEqual(390);
  }
});
