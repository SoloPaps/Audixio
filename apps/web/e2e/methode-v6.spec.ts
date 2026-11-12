import { expect, type Page, test } from '@playwright/test';
import { toEnglish } from './en-session.js';

/**
 * /methode v6 (histoire v2) : histoire épinglée, barème à essayer,
 * calculette, FAQ, dock, liens réels, anglais et stabilité.
 * Contraste, sombre, anglais sans français et 390 px : pages.spec.
 */

type View = {
  getComputedStyle: (node: unknown) => Record<string, string>;
  innerWidth: number;
};

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/methode${query}`);
  await page.locator('main.me').waitFor();
}

test.describe('/methode v6', () => {
  test('titre, version et ancres publiques gardés', async ({ page }) => {
    await open(page);
    await expect(page).toHaveTitle('Méthode — Audixio');
    await expect(page.locator('h1')).toHaveText(
      'Comment Audixio note votre site.',
    );
    for (const id of [
      'principe',
      'bareme',
      'domaines',
      'method-repro',
      'method-never',
      'limites',
      'faq',
      'method-lighthouse',
    ]) {
      await expect(page.locator(`#${id}`), id).toHaveCount(1);
    }
  });

  test('mouvement réduit : l’histoire est posée, toutes les scènes visibles', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await expect(page.locator('main.me')).not.toHaveClass(/\bmo\b/);
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-s', '5');
    const story = page.locator('#principe');
    await story.scrollIntoViewIfNeeded();
    for (const scene of ['.sc-site', '.sc-tests', '.sc-doms', '.sc-scale']) {
      await expect(story.locator(scene), scene).toBeVisible();
    }
    await expect(story.locator('.beat')).toHaveCount(6);
    for (const beat of await story.locator('.beat').all()) {
      await expect(beat).toBeVisible();
    }
  });

  test('au chargement, la scène finale ne s’efface pas en fondu', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    await expect(page.locator('main.me')).toHaveClass(/\bmo\b/);
    // Lu aussitôt : sans pose immédiate, la scène est encore à mi-fondu.
    const opacity = await page
      .locator('.sc-scale')
      .evaluate(
        (node) =>
          (globalThis as unknown as View).getComputedStyle(node).opacity,
      );
    expect(opacity).toBe('0');
    await expect(page.locator('.story.snap')).toHaveCount(0);
  });

  test('l’histoire suit l’étape lue, la scène reste épinglée', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await expect(page.locator('main.me')).toHaveClass(/\bmo\b/);
    const stage = page.locator('[data-stage]');
    const tops: number[] = [];
    for (const step of [0, 2, 4]) {
      await page
        .locator('.beat')
        .nth(step)
        .evaluate((node) => {
          const box = node.getBoundingClientRect();
          (
            globalThis as unknown as {
              scrollBy: (x: number, y: number) => void;
            }
          ).scrollBy(0, box.top + box.height / 2 - 450);
        });
      await expect(stage).toHaveAttribute('data-s', String(step));
      await expect(page.locator('.beat.on')).toHaveCount(1);
      const top = await page
        .locator('.stage-w')
        .evaluate((node) => node.getBoundingClientRect().top);
      tops.push(Math.round(top));
    }
    // Épinglée : la scène ne bouge pas d’une étape à l’autre.
    expect(new Set(tops).size).toBe(1);
  });

  test('barème : le curseur donne la lettre et éclaire sa ligne, E et F compris', async ({
    page,
  }) => {
    await open(page);
    const out = page.locator('[data-try-out]');
    await expect(out).toHaveText('72 donne C, à améliorer.');
    await expect(page.locator('.gt tr.on')).toHaveAttribute('data-g', 'C');
    const range = page.locator('#try');
    for (const [score, text, grade] of [
      ['90', '90 donne A, excellent.', 'A'],
      ['49', '49 donne E, problème.', 'E'],
      ['34', '34 donne F, problème.', 'F'],
    ] as const) {
      await range.fill(score);
      await expect(out).toHaveText(text);
      await expect(page.locator('.gt tr.on')).toHaveAttribute('data-g', grade);
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        `${score}, ${grade}`,
      );
    }
    await range.focus();
    await page.keyboard.press('ArrowRight');
    await expect(out).toHaveText('35 donne E, problème.');
    await expect(page.locator('.gt tr[data-g]')).toHaveCount(6);
  });

  test('calculette : compter ou retirer un domaine refait la moyenne', async ({
    page,
  }) => {
    await open(page);
    const calc = page.locator('[data-component="Calc"]');
    const res = calc.locator('[data-calc-res]');
    await expect(res).toHaveText('(72 + 88 + 64 + 58 + 81 + 93 + 70) ÷ 7 = 75');
    await expect(calc.locator('[data-calc-g]')).toHaveText('C');
    const dns = calc.getByRole('button', { name: /DNS et e-mail/ });
    await expect(dns).toHaveAttribute('aria-pressed', 'false');
    await expect(dns).toContainText('Non testé');
    await dns.click();
    await expect(dns).toHaveAttribute('aria-pressed', 'true');
    await expect(res).toHaveText(
      '(72 + 88 + 64 + 58 + 81 + 93 + 70 + 40) ÷ 8 = 71',
    );
    await expect(calc.locator('[data-calc-live]')).toHaveText(
      'Note globale : 71, C, à améliorer.',
    );
    for (const button of await calc.locator('.calc button').all()) {
      if ((await button.getAttribute('aria-pressed')) === 'true')
        await button.click();
    }
    await expect(res).toHaveText(
      'Aucun domaine noté : la note globale est « non testé ».',
    );
    await expect(calc.locator('[data-calc-g]')).toBeHidden();
  });

  test('FAQ : Échap referme la question ouverte et rend le focus', async ({
    page,
  }) => {
    await open(page);
    const first = page.locator('#faq details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(first).not.toHaveAttribute('open', '');
    await expect(first.locator('summary')).toBeFocused();
  });

  test('dock : caché sur le héros, libellés sur une ligne au large', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const dock = page.locator('nav.dock');
    await expect(dock).not.toHaveClass(/\bon\b/);
    await page.locator('#bareme').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    await expect(dock).toHaveClass(/\bon\b/);
    await expect(dock.locator('.dock-btn')).toBeHidden();
    // Une ligne par libellé : left: 50% ne réduit plus le dock de moitié.
    for (const link of await dock.locator('.dock-l a').all()) {
      const height = await link.evaluate(
        (node) => node.getBoundingClientRect().height,
      );
      expect(height).toBeLessThan(48);
    }
    await expect(dock.locator('.dock-l .num').first()).toBeHidden();
    await page.locator('#fin').scrollIntoViewIfNeeded();
    await expect(dock).not.toHaveClass(/\bon\b/);
  });

  test('dock en 390 px : toute la largeur, bouton et retour en haut', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.locator('#domaines').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    const dock = page.locator('nav.dock');
    await expect(dock).toHaveClass(/\bon\b/);
    const box = await dock.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(330);
    await expect(dock.locator('.dock-btn')).toBeVisible();
    await dock.locator('.dock-btn').click();
    await expect(dock.locator('.dock-l')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dock.locator('.dock-l')).toBeHidden();
  });

  test('liens fléchés : trait au survol, couleur du rayon', async ({
    page,
  }) => {
    await open(page);
    const link = page.locator('#method-never .lnk');
    await expect(link).toHaveAttribute('href', '/robot');
    await link.scrollIntoViewIfNeeded();
    const size = () =>
      link.evaluate(
        (node) =>
          (globalThis as unknown as View).getComputedStyle(node).backgroundSize,
      );
    expect(await size()).toMatch(/^0(px)? /);
    await link.hover();
    await expect.poll(size).not.toMatch(/^0(px)? /);
  });

  test('chaque lien de la page mène à une page qui existe', async ({
    page,
    request,
  }) => {
    await open(page);
    const hrefs = await page
      .locator('main.me a[href^="/"], footer a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(
          links.map((link) => (link.getAttribute('href') ?? '').split('#')[0]),
        ),
      ]);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/',
        '/robot',
        '/ecoconception',
        '/exemple-rapport',
      ]),
    );
    for (const href of hrefs) {
      const res = await request.get(href || '/');
      expect(res.status(), href).toBeLessThan(400);
    }
    const anchors = await page
      .locator('main.me a[href^="#"]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href') ?? ''),
      );
    for (const anchor of anchors)
      await expect(page.locator(anchor), anchor).toHaveCount(1);
    await expect(page.locator('#fin a.btn').first()).toHaveAttribute(
      'href',
      '/#audit-form',
    );
  });

  for (const width of [1440, 390]) {
    test(`mise en page stable au chargement, ${width} px (CLS < 0,1)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(`
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      `);
      await open(page);
      await page.waitForTimeout(1500);
      const cls = await page.evaluate<number>('window.__cls');
      expect(cls).toBeLessThan(0.1);
      const overflow = await page.evaluate<number>(
        'document.documentElement.scrollWidth - window.innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('en anglais : histoire, barème et calculette traduits', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await toEnglish(page);
    await open(page);
    await expect(page.locator('h1')).toHaveText(
      'How Audixio grades your site.',
    );
    await expect(page.locator('[data-try-out]')).toHaveText(
      '72 gives C, needs work.',
    );
    await page.locator('#try').fill('95');
    await expect(page.locator('[data-try-out]')).toHaveText(
      '95 gives A, excellent.',
    );
    const calc = page.locator('[data-component="Calc"]');
    await expect(
      calc.getByRole('button', { name: /DNS and email/ }),
    ).toContainText('Not tested');
    await expect(page.locator('.pipe-v .v-w')).toHaveText('0.5');
    const text = (await page.locator('main.me').innerText()).replace(
      /\s+/g,
      ' ',
    );
    expect(text).not.toMatch(/\b(donne|à améliorer|Problème|Non testé)\b/);
  });
});
