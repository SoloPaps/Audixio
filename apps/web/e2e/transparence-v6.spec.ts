import { expect, test } from '@playwright/test';

/**
 * /robot, /ecoconception, /accessibilite en v6 : gabarit V6Page, Geist,
 * jetons v6 dans les deux thèmes, bandeau final lisible (texte --cta-fg sur
 * --cta), 390 px sans débordement, liens internes réels.
 */
const PAGES = [
  { path: '/robot', vue: 'robot', sc: 'rb' },
  { path: '/ecoconception', vue: 'ecologie', sc: 'eco' },
  { path: '/accessibilite', vue: 'accessibilite', sc: 'acc' },
] as const;

type Mesure = { font: string; ink: string; worst: number; n: number };

const mesurer = `(() => {
  const L = (c) => {
    const [r, g, b] = (c.match(/[\\d.]+/g) || []).slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      const bg = s.backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      if (s.backgroundImage.includes('gradient')) {
        // Premier arrêt opaque du dégradé (les voiles rgba(…, 0.1) sont ignorés).
        const m = (s.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).find((c) => !/,\\s*0?\\.\\d+\\)$|,\\s*0\\)$/.test(c));
        if (m) return m;
      }
    }
    return 'rgb(255, 255, 255)';
  };
  let worst = 99, n = 0;
  for (const el of document.querySelectorAll('main .btn-primary, main .end h2, main .end p, main .end .rel, main .end .rel a, main .callout .ico, main .skip')) {
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
    const a = L(getComputedStyle(el).color), b = L(fond(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    worst = Math.min(worst, ratio); n++;
  }
  const h1 = document.querySelector('h1');
  return { font: getComputedStyle(h1).fontFamily, ink: getComputedStyle(document.querySelector('main')).color, worst, n };
})()`;

for (const p of PAGES) {
  test.describe(`${p.path} v6`, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`gabarit, Geist et contraste (${theme})`, async ({ page }) => {
        await page.goto(`${p.path}?theme=${theme}`);
        await expect(page.locator(`main.${p.sc}`)).toBeVisible();
        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-v6', '');
        await expect(html).toHaveAttribute('data-page', p.vue);
        await expect(
          page.locator('footer[data-dock-hide] .cols'),
        ).toBeVisible();
        const m = await page.evaluate<Mesure>(mesurer);
        expect(m.font).toMatch(/^"?Geist/);
        // Plus l'encre v2 #1e2a55.
        expect(m.ink).not.toBe('rgb(30, 42, 85)');
        expect(m.n).toBeGreaterThan(0);
        expect(m.worst).toBeGreaterThanOrEqual(4.5);
      });
    }

    test('390 px : rien ne déborde, liens internes réels', async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p.path);
      const over = await page.evaluate<number>(
        '(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()',
      );
      expect(over).toBeLessThanOrEqual(0);
      const hrefs = await page.evaluate<string[]>(`(() => [...new Set(
        [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter(Boolean)
      )])()`);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const h of hrefs) {
        const r = await request.get(h, { maxRedirects: 0 });
        expect(r.status(), h).toBeLessThan(400);
      }
    });
  });
}
