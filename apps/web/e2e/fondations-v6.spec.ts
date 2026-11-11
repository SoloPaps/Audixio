import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const en = readFileSync(
  new URL('../public/dictionnaire-en.json', import.meta.url),
  'utf8',
);
const fr = readFileSync(
  new URL('../public/dictionnaire-fr.json', import.meta.url),
  'utf8',
);

const widths = [1440, 390] as const;
const themes = ['light', 'dark'] as const;
const langs = ['fr', 'en'] as const;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const width of widths) {
  for (const theme of themes) {
    for (const lang of langs) {
      test(`banc ${width} ${theme} ${lang}`, async ({ page }) => {
        await page.addInitScript(
          ({ theme: asked, lang: askedLang, english, french }) => {
            localStorage.setItem('audigy-theme', asked);
            if (askedLang === 'en') {
              localStorage.setItem('audigy-locale', 'en');
              localStorage.setItem('audigy-en', english);
              localStorage.setItem('audigy-fr', french);
            }
          },
          { theme, lang, english: en, french: fr },
        );
        await page.setViewportSize({
          width,
          height: width === 1440 ? 900 : 844,
        });
        const response = await page.goto(`/dev/fondations?theme=${theme}`, {
          waitUntil: 'networkidle',
        });
        expect(response?.ok()).toBeTruthy();
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content:
            '[data-v6] .dock{position:relative;left:auto;right:auto;bottom:auto;translate:none;margin:2rem auto;max-width:100%}',
        });
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
          'content',
          theme,
        );
        const label = lang === 'en' ? 'Continue' : 'Continuer';
        await expect(page.getByRole('button', { name: label })).toBeVisible();
        await expect(page).toHaveScreenshot(
          `fondations-${width}-${theme}-${lang}.png`,
          { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.02 },
        );
      });
    }
  }
}

test('le bouton désactivé et le focus restent visibles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dev/fondations?theme=light', { waitUntil: 'networkidle' });
  const disabled = page.getByRole('button', { name: 'Désactivé' });
  await expect(disabled).toBeDisabled();
  await page.locator('#boutons .btn').first().focus();
  const outline = await page
    .locator('#boutons .btn')
    .first()
    .evaluate((node) => {
      const view = getComputedStyle(node);
      return { style: view.outlineStyle, width: view.outlineWidth };
    });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBe('3px');
});
