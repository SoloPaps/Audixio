import { expect, type Page, test } from '@playwright/test';
import { stubSiteAccount } from './site-session.js';

/**
 * Lot 5 : plus aucune page sur Canon. Chaque page restante (accès, légales,
 * erreurs, note publique, progression, demandes) est sur V6Page, sa feuille
 * portée sous une classe, en Geist, sans l’encre v2, lisible en clair et en
 * sombre, sans débordement à 390 px, avec des liens internes réels.
 */
const PAGES = [
  { path: '/connexion', vue: 'auth', sc: 'au' },
  { path: '/inscription', vue: 'auth', sc: 'au' },
  { path: '/email-confirme', vue: 'auth', sc: 'au' },
  { path: '/reinitialisation', vue: 'auth', sc: 'au' },
  { path: '/cgu', vue: 'cgu', sc: 'lgc' },
  { path: '/confidentialite', vue: 'confidentialite', sc: 'lgp' },
  { path: '/mentions-legales', vue: 'mentions', sc: 'lgm' },
  { path: '/404', vue: 'e404', sc: 'er4' },
  { path: '/500', vue: 'e500', sc: 'er5' },
  { path: '/maintenance', vue: 'maintenance', sc: 'mnt' },
  { path: '/audit-echoue', vue: 'audit', sc: 'aec' },
  { path: '/progression', vue: 'progression', sc: 'prg' },
  { path: '/score/exemple-score-verifie', vue: 'score', sc: 'sp' },
  {
    path: '/sites/exemple.fr/demandes/req_948f2a1b7e',
    vue: 'acces',
    sc: 'dmd',
  },
] as const;

type Mesure = { font: string; ink: string; h1: number; worst: number };

/** Contraste du titre et des boutons pleins sur leur fond réel. */
const mesurer = `(() => {
  const L = (c) => {
    const [r, g, b] = (c.match(/[\\d.]+/g) || []).slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // Fond plein en rgb() seulement : voiles rgba(…, 0.x) et color-mix translucides (oklab … / 0.88) sont traversés.
  const opaque = (c) => /^rgba?\\(/.test(c || '') && !/rgba\\(0, 0, 0, 0\\)/.test(c) && !/,\\s*0?\\.\\d+\\)$|,\\s*0\\)$/.test(c);
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (opaque(s.backgroundColor)) return s.backgroundColor;
      const m = (s.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).find(opaque);
      if (m) return m;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const ratio = (el) => {
    const a = L(getComputedStyle(el).color), b = L(fond(el));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const h1 = document.querySelector('main h1');
  let worst = 99;
  for (const el of document.querySelectorAll('main .btn-primary')) {
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
    worst = Math.min(worst, ratio(el));
  }
  return { font: getComputedStyle(h1).fontFamily, ink: getComputedStyle(h1).color, h1: ratio(h1), worst };
})()`;

async function gabarit(page: Page, vue: string, sc: string) {
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-v6', '');
  await expect(html).toHaveAttribute('data-page', vue);
  await expect(page.locator(`.${sc}`).first()).toBeAttached();
  await expect(page.locator('footer[data-dock-hide] .cols')).toBeVisible();
}

for (const p of PAGES) {
  test.describe(`${p.path} v6`, () => {
    for (const theme of ['light', 'dark'] as const) {
      test(`gabarit, Geist et contraste (${theme})`, async ({ page }) => {
        await page.goto(
          `${p.path}${p.path.includes('?') ? '&' : '?'}theme=${theme}`,
        );
        await expect(page.locator('main h1').first()).toBeVisible();
        await gabarit(page, p.vue, p.sc);
        const m = await page.evaluate<Mesure>(mesurer);
        expect(m.font).toMatch(/^"?Geist/);
        expect(m.ink).not.toBe('rgb(30, 42, 85)');
        expect(m.h1).toBeGreaterThanOrEqual(3);
        expect(m.worst).toBeGreaterThanOrEqual(4.5);
      });
    }

    test('390 px : rien ne déborde, liens internes réels', async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p.path);
      await expect(page.locator('main h1').first()).toBeVisible();
      const over = await page.evaluate<number>(
        '(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()',
      );
      expect(over).toBeLessThanOrEqual(0);
      const hrefs = await page.evaluate<string[]>(`(() => [...new Set(
        [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter(Boolean)
      )])()`);
      for (const h of hrefs) {
        const r = await request.get(h, { maxRedirects: 0 });
        expect(r.status(), h).toBeLessThan(400);
      }
    });
  });
}

test.describe('pages connectées (compte simulé)', () => {
  const CONNECTEES = [
    { path: '/sites', vue: 'sites', sc: 'msl', board: 'liste', sites: true },
    { path: '/sites', vue: 'sites', sc: 'msl', board: 'vide', sites: false },
    { path: '/bienvenue', vue: 'bienvenue', sc: 'bv', sites: true },
    { path: '/historique', vue: 'historique', sc: 'hs', sites: true },
  ] as const;
  for (const c of CONNECTEES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${c.path}${'board' in c ? ` (${c.board})` : ''} en v6, 390 px, ${theme}`, async ({
        page,
      }) => {
        await stubSiteAccount(page, { sites: c.sites });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${c.path}?theme=${theme}`);
        await expect(page.locator('main h1').first()).toBeVisible();
        await gabarit(page, c.vue, c.sc);
        if ('board' in c) {
          await expect(page.locator('html')).toHaveAttribute(
            'data-board',
            c.board,
          );
        }
        const m = await page.evaluate<Mesure>(mesurer);
        expect(m.font).toMatch(/^"?Geist/);
        expect(m.h1).toBeGreaterThanOrEqual(3);
        expect(m.worst).toBeGreaterThanOrEqual(4.5);
        const over = await page.evaluate<number>(
          '(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()',
        );
        expect(over).toBeLessThanOrEqual(0);
      });
    }
  }
});

test('/cookies en v6 : boîte de dialogue sur un voile, page immobile, pied hors champ', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.goto(`/cookies?theme=${theme}`);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-v6', '');
    await expect(html).toHaveAttribute('data-page', 'cookies');
    const dialog = page.getByRole('dialog', {
      name: 'Vos choix sur les cookies',
    });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.cks[data-port] main#contenu')).toBeAttached();
    await expect(page.locator('footer[data-dock-hide]')).not.toBeInViewport();
    await expect(page.locator('#ct')).toHaveCSS('font-family', /^"?Geist/);
  }
});
