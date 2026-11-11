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
        await page.evaluate(
          () =>
            (
              globalThis as unknown as {
                document: { fonts: { ready: Promise<unknown> } };
              }
            ).document.fonts.ready,
        );
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
        const nav =
          lang === 'en'
            ? ['Home', 'Method', 'Tracked sites', 'Pricing']
            : ['Accueil', 'Méthode', 'Sites suivis', 'Tarifs'];
        await expect(page.locator('.axn-links a')).toHaveText(nav);
        await expect(page.locator('.axn-bar .axn-cta')).toHaveText(
          lang === 'en' ? 'Sign in' : 'Connexion',
        );
        await expect(page.locator('header.axn')).toHaveAttribute('id', 'axn');
        await expect(page).toHaveScreenshot(
          `fondations-${width}-${theme}-${lang}.png`,
          { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.02 },
        );
      });
    }
  }
}

for (const lang of langs) {
  test(`aucun contrôle d’en-tête ne passe à la ligne de 320 à 390 (${lang})`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ askedLang, english, french }) => {
        if (askedLang === 'en') {
          localStorage.setItem('audigy-locale', 'en');
          localStorage.setItem('audigy-en', english);
          localStorage.setItem('audigy-fr', french);
        }
      },
      { askedLang: lang, english: en, french: fr },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dev/fondations?theme=light', {
      waitUntil: 'networkidle',
    });
    await page.evaluate(
      () =>
        (
          globalThis as unknown as {
            document: { fonts: { ready: Promise<unknown> } };
          }
        ).document.fonts.ready,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', lang);

    for (let width = 320; width <= 390; width += 1) {
      await page.setViewportSize({ width, height: 844 });
      const wrapped = await page.evaluate(() => {
        const host = globalThis as unknown as {
          document: {
            querySelectorAll: (selector: string) => Iterable<unknown>;
            createRange: () => {
              selectNodeContents: (node: unknown) => void;
              getClientRects: () => Iterable<{
                width: number;
                height: number;
                top: number;
              }>;
            };
            createTreeWalker: (
              root: unknown,
              what: number,
            ) => {
              nextNode: () => {
                textContent: string | null;
                parentElement: {
                  closest: (selector: string) => unknown;
                } | null;
              } | null;
            };
          };
          getComputedStyle: (node: unknown) => {
            display: string;
            visibility: string;
          };
          NodeFilter: { SHOW_TEXT: number };
        };
        const nodes = [
          ...host.document.querySelectorAll('button, nav a, a.login'),
        ];
        const hits: string[] = [];
        for (const el of nodes) {
          const view = host.getComputedStyle(el);
          if (view.display === 'none' || view.visibility === 'hidden') continue;
          const range = host.document.createRange();
          const walker = host.document.createTreeWalker(
            el,
            host.NodeFilter.SHOW_TEXT,
          );
          let node = walker.nextNode();
          const tops = new Set<number>();
          while (node) {
            const value = node.textContent ?? '';
            const parent = node.parentElement;
            if (value.trim() && !parent?.closest('svg')) {
              range.selectNodeContents(node);
              for (const rect of range.getClientRects()) {
                if (rect.width > 0 && rect.height > 0)
                  tops.add(Math.round(rect.top));
              }
            }
            node = walker.nextNode();
          }
          if (tops.size > 1)
            hits.push((labelOf(el) ?? '').replace(/\s+/g, ' ').trim());
        }
        return hits;
        function labelOf(node: unknown): string | null {
          return (node as { textContent?: string | null }).textContent ?? null;
        }
      });
      expect(wrapped, `${lang} ${width}`).toEqual([]);
      const overflow = await page.evaluate(() => {
        const bar = (
          globalThis as unknown as {
            document: {
              querySelector: (
                selector: string,
              ) => { scrollWidth: number; clientWidth: number } | null;
            };
          }
        ).document.querySelector('.axn-bar');
        if (!bar) return 0;
        return Math.ceil(bar.scrollWidth - bar.clientWidth);
      });
      expect(overflow, `${lang} ${width} déborde`).toBeLessThanOrEqual(1);
    }
  });
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
      const view = (
        globalThis as unknown as {
          getComputedStyle: (target: unknown) => {
            outlineStyle: string;
            outlineWidth: string;
          };
        }
      ).getComputedStyle(node);
      return { style: view.outlineStyle, width: view.outlineWidth };
    });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBe('3px');
});
