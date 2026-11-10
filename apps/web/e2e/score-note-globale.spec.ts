import { expect, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

const COMPLETE = '/score/exemple-score/';
const INCOMPLETE = '/score/exemple-score-partiel/';
const DEFERRED_FR = 'Note globale disponible dans le rapport complet';
const DEFERRED_EN = 'Overall grade available in the full report';

async function openScore(
  page: Page,
  path: string,
  theme: 'light' | 'dark',
  width: 330 | 1280,
  lang: 'fr' | 'en',
): Promise<void> {
  await page.setViewportSize({ width, height: width === 330 ? 800 : 900 });
  await page.goto(`${path}?theme=${theme}`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  if (lang === 'en') await toEnglish(page);
}

test.describe('note globale publique', () => {
  for (const lang of ['fr', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const width of [330, 1280] as const) {
        const tag = `${lang} ${theme} ${width}px`;

        test(`complet 5/5 : chiffre et lettre du rapport (${tag})`, async ({
          page,
        }) => {
          await openScore(page, COMPLETE, theme, width, lang);
          const gauge = page.locator('.gauge[data-size="hero"]');
          await expect(gauge).toBeVisible();
          await expect(gauge).toHaveAttribute('data-score', '65');
          await expect(gauge).toHaveAttribute('data-grade', 'C');
          await expect(page.getByText(DEFERRED_FR)).toHaveCount(0);
          await expect(page.getByText(DEFERRED_EN)).toHaveCount(0);
        });

        test(`incomplet : libellé #188, pas de jauge globale (${tag})`, async ({
          page,
        }) => {
          await openScore(page, INCOMPLETE, theme, width, lang);
          await expect(page.locator('.gauge[data-size="hero"]')).toHaveCount(0);
          await expect(
            page.getByText(lang === 'en' ? DEFERRED_EN : DEFERRED_FR),
          ).toBeVisible();
        });
      }
    }
  }
});
