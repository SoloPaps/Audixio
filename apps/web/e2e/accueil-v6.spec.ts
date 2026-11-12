import { expect, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

/**
 * Accueil v6 : interactions au clavier et à la souris, mouvement réduit,
 * stabilité de la mise en page, liens réels, barre et dock.
 * Contraste, sombre, anglais et 390 px : pages.spec.
 */

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await page.locator('main.ac').waitFor();
}

test.describe('accueil v6', () => {
  test('mouvement réduit : le scan est posé sur son résultat, sans animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const hero = page.locator('#top');
    await expect(hero.locator('[data-ringl]')).toHaveText('C');
    await expect(hero.locator('[data-ringn2]')).toHaveText('67');
    await expect(hero.locator('[data-scanst]')).toHaveText('Scan terminé');
    await expect(hero.locator('.journal li.on')).toHaveCount(5);
    await page.locator('#comment [data-ringn]').scrollIntoViewIfNeeded();
    await expect(page.locator('#comment [data-ringn]')).toHaveText('8');
  });

  test('les 8 domaines se choisissent au clavier, le panneau suit', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const tabs = page.locator('#domaines [role=tab]');
    await expect(tabs).toHaveCount(8);
    await tabs.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'false');
    const panel = page.locator('#domaines [role=tabpanel].on');
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText('Google');
    await page.keyboard.press('End');
    await expect(tabs.nth(7)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('le jeu compte les problèmes trouvés, puis félicite à 4 sur 4', async ({
    page,
  }) => {
    await open(page);
    const game = page.locator('#jeu');
    const spots = game.locator('.spot');
    await spots.nth(0).click();
    await expect(spots.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(game.locator('[data-gn]')).toHaveText('1');
    await game.locator('[data-all]').click();
    await expect(game.locator('[data-gall]')).toBeVisible();
    await expect(game.locator('[data-gcount]')).toBeHidden();
    await expect(game.locator('[data-xr]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('l’aperçu du rapport met en avant le point choisi', async ({ page }) => {
    await open(page);
    const keys = page.locator('#rapport [data-hl]');
    await keys.nth(2).click();
    await expect(keys.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#rapport .rp-body')).toHaveAttribute(
      'data-hl-on',
      '3',
    );
  });

  test('FAQ : Échap referme la question ouverte et rend le focus', async ({
    page,
  }) => {
    await open(page);
    const first = page.locator('#faq details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await first.locator('summary').focus();
    await page.keyboard.press('Escape');
    await expect(first).not.toHaveAttribute('open', '');
    await expect(first.locator('summary')).toBeFocused();
  });

  test('HTML valide : chaque légende est l’enfant direct de sa figure', async ({
    page,
  }) => {
    // qualite.html (self-audit) refuse une figcaption hors de <figure>.
    await page.goto('/');
    const stray = await page
      .locator('figcaption')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) => node.parentElement?.tagName !== 'FIGURE')
            .length,
      );
    expect(stray).toBe(0);
    await expect(page.locator('figure.scanner')).toHaveAttribute(
      'aria-labelledby',
      'scan-cap',
    );
    await expect(page.locator('#scan-cap')).toBeVisible();
  });

  test('fenêtre visiteur ouverte : la page v6 ne défile plus derrière', async ({
    page,
  }) => {
    // guest-gate.css visait html[data-vue] (Canon) ; V6Page n’a que data-v6.
    await page.goto('/');
    await page
      .locator('html')
      .evaluate((html) => html.classList.add('gg-lock'));
    const body = await page.locator('body').evaluate(
      (node) =>
        (
          globalThis as unknown as {
            getComputedStyle: (el: unknown) => { overflow: string };
          }
        ).getComputedStyle(node).overflow,
    );
    expect(body).toBe('hidden');
  });

  test('« Scanner mon site » mène au formulaire du héros', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const cta = page.locator('.axn-bar .axn-cta');
    await expect(cta).toHaveText(/Scanner mon site/);
    await expect(cta).toHaveAttribute('href', '/#audit-form');
    await expect(page.locator('#audit-form')).toBeVisible();
    await expect(page.getByLabel('Adresse du site à scanner')).toBeVisible();
  });

  test('une adresse sans https:// est acceptée par le formulaire', async ({
    page,
  }) => {
    await open(page);
    let sent = '';
    await page.route(/\/api\/(guest-)?audits/, async (route) => {
      sent = String(
        (route.request().postDataJSON() as { url?: string }).url ?? '',
      );
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{}',
      });
    });
    await page.getByLabel('Adresse du site à scanner').fill('exemple.fr');
    await page
      .getByRole('button', { name: 'Scanner mon site, gratuit' })
      .click();
    await expect.poll(() => sent).toBe('https://exemple.fr');
  });

  test('le dock reste caché sur le héros et apparaît dans les sections', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const dock = page.locator('nav.dock');
    await expect(dock).not.toHaveClass(/\bon\b/);
    await page.locator('#couches').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(dock).toHaveClass(/\bon\b/);
    await expect(dock.locator('.dock-l a')).toHaveCount(8);
  });

  test('dock au large : sans bouton de menu, chaque libellé sur une ligne', async ({
    page,
  }) => {
    // left: 50% bornait le dock à la moitié de l’écran : libellés sur deux
    // lignes, et le bouton « Sections » s’affichait aussi en 1440 px.
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.locator('#couches').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    const dock = page.locator('nav.dock');
    await expect(dock).toHaveClass(/\bon\b/);
    await expect(dock.locator('.dock-btn')).toBeHidden();
    for (const link of await dock.locator('.dock-l a').all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 99).toBeLessThan(48);
    }
  });

  test('dock en 390 px : toute la largeur, le menu s’ouvre', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.locator('#couches').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    const dock = page.locator('nav.dock');
    await expect(dock).toHaveClass(/\bon\b/);
    expect((await dock.boundingBox())?.width ?? 0).toBeGreaterThan(330);
    await dock.locator('.dock-btn').click();
    await expect(dock.locator('.dock-l')).toBeVisible();
  });

  test('chaque lien de la page mène à une page qui existe', async ({
    page,
    request,
  }) => {
    await open(page);
    const hrefs = await page
      .locator('main.ac a[href^="/"], footer a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(
          links.map((link) => (link.getAttribute('href') ?? '').split('#')[0]),
        ),
      ]);
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      const res = await request.get(href || '/');
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  // CI 12/11, CLS 0,117 à 390 px : le halo du héros (inset: -10 %) suivait la
  // hauteur du héros ; un premier rendu avant la fin du HTML le faisait remonter.
  test('halo du héros : sa position ne dépend pas de la hauteur du héros', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await open(page);
    const hero = page.locator('#top');
    const top = () =>
      hero.evaluate((node) =>
        Number.parseFloat(
          (
            globalThis as unknown as {
              getComputedStyle: (
                el: unknown,
                pseudo: string,
              ) => { top: string };
            }
          ).getComputedStyle(node, '::before').top,
        ),
      );
    const before = await top();
    await hero.evaluate((node) => {
      node.style.minHeight = `${node.offsetHeight * 2}px`;
    });
    expect(await top()).toBe(before);
  });

  // Le premier rendu (police de repli) et le rendu final (Geist) ont la même géométrie.
  for (const width of [1440, 390]) {
    test(`mise en page stable au chargement, ${width} px (CLS < 0,1)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(`
        window.__cls = 0;
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__cls += entry.value;
            window.__shifts.push({
              value: Number(entry.value.toFixed(3)),
              at: Math.round(entry.startTime),
              bar: innerWidth - document.documentElement.clientWidth,
              html: document.documentElement.className,
              fonts: document.fonts.status,
              sheets: document.styleSheets.length,
              nodes: entry.sources.map((s) => {
                const n = s.node;
                if (!n || !n.nodeName) return '?';
                const el = n.nodeType === 1 ? n : n.parentElement;
                const id = el && el.id ? '#' + el.id : '';
                const cls = el && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '';
                return (n.nodeName + id + cls).slice(0, 60) + ' ' + JSON.stringify([s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height, s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height]);
              }),
            });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      `);
      await open(page);
      await page.waitForTimeout(1500);
      const cls = await page.evaluate<number>('window.__cls');
      // En cas d’échec, le message nomme les nœuds déplacés et le moment.
      const shifts = await page.evaluate<unknown>('window.__shifts');
      expect(cls, JSON.stringify(shifts)).toBeLessThan(0.1);
    });
  }

  test('en anglais : titre, scan et jeu traduits', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await toEnglish(page);
    await open(page);
    await expect(page.locator('h1')).toContainText('What your site hides');
    await expect(page.locator('#top [data-scanst]')).toHaveText(
      'Scan complete',
    );
    await expect(page.locator('#jeu [data-gcount]')).toContainText('found');
    await expect(page.locator('.axn-bar .axn-cta')).toHaveText(/Scan my site/);
  });
});
