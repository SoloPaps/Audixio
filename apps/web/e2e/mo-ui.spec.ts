import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './en-session.js';

// QA Mo 05/11 : affichage à 330 px et thème sombre.

test('M8 : bandeau cookies « Customise » à 330 px, rien de rogné', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/cookies?theme=light&lang=en');
  const back = page.locator('.bn .ft a');
  await expect(back).toHaveText('Back to the home page');
  await page.locator('#ps').click();
  await expect(page.locator('#ps')).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(700);
  await back.scrollIntoViewIfNeeded();
  // Script en chaîne : pas de types DOM côté Node.
  const geo = await page.evaluate<{
    clipped: number;
    inside: boolean;
    onScreen: boolean;
  }>(`(() => {
    const bn = document.querySelector('.bn');
    const box = bn.getBoundingClientRect();
    const r = document.querySelector('.bn .ft a').getBoundingClientRect();
    return {
      clipped: bn.scrollHeight - bn.clientHeight,
      inside: r.bottom <= box.bottom + 0.5 && r.top >= box.top - 0.5,
      onScreen: r.bottom <= innerHeight + 0.5 && r.top >= -0.5,
    };
  })()`);
  expect(geo.clipped).toBeLessThanOrEqual(1);
  expect(geo.inside).toBe(true);
  expect(geo.onScreen).toBe(true);
  await expect(back).toBeInViewport();
});

test('M10 : /compte#acces-partages (lien « Gérer les accès ») défile jusqu’à la section', async ({
  page,
}) => {
  await stubSession(page, 'pro');
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/compte?theme=light#acces-partages');
  const section = page.locator('#acces-partages');
  await expect(section).toBeAttached({ timeout: 15_000 });
  await expect(section).toBeInViewport();
  expect(await page.evaluate<number>('window.scrollY')).toBeGreaterThan(200);
});

test('M11 : /pro à 330 px, seul le tableau de comparaison défile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/pro?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForLoadState('networkidle');
  const cmp = page.locator('section.cmp');
  await cmp.locator('h2').scrollIntoViewIfNeeded();
  // Scripts en chaîne : pas de types DOM côté Node.
  const before = await page.evaluate<{
    page: number;
    section: number;
    title: number;
  }>(`(() => {
    const section = document.querySelector('section.cmp');
    return {
      page: document.documentElement.scrollWidth,
      section: section.scrollWidth - section.clientWidth,
      title: section.querySelector('h2').getBoundingClientRect().left,
    };
  })()`);
  expect(before.page).toBeLessThanOrEqual(330);
  expect(before.section).toBeLessThanOrEqual(0);
  await page.evaluate(`document.querySelector('.cmp-scroll').scrollLeft = 400`);
  const after = await page.evaluate<{
    section: number;
    title: number;
  }>(`(() => {
    const section = document.querySelector('section.cmp');
    return {
      section: section.scrollLeft,
      title: section.querySelector('h2').getBoundingClientRect().left,
    };
  })()`);
  expect(after.section).toBe(0);
  expect(after.title).toBe(before.title);
  await expect(cmp.locator('h2')).toBeInViewport();
  const cta = cmp.locator('.cta');
  await cta.scrollIntoViewIfNeeded();
  const ctaBox = await cta.boundingBox();
  expect((ctaBox?.x ?? -1) >= 0).toBe(true);
  expect((ctaBox?.x ?? 999) + (ctaBox?.width ?? 999)).toBeLessThanOrEqual(330);
});

const AUDIT_ID = '00000000-0000-4000-8000-0000000000b5';

async function verifiedReport(
  page: Page,
  score = 86,
  scores: Record<string, number> = {},
): Promise<void> {
  const body = {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: score,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      'performance',
      'accessibilite',
      'seo',
      'ecoconception',
      'rgpd',
      'qualite',
      'mobile',
      'securite',
    ].map((domain) => ({
      domain,
      score: scores[domain] ?? score,
      coverage: 1,
      level: 'improve',
    })),
    findings: [],
  };
  await stubSession(page, 'pro');
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

test('M13 : badge Complet et Compact affichent le libellé et la note', async ({
  page,
}) => {
  await verifiedReport(page);
  // Décision du 6 nov. : sans lien public, le badge demande d’abord de le
  // créer ; ce test du rendu du badge part donc d’un rapport déjà partagé.
  await page.route('http://127.0.0.1:54321/rest/v1/reports**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': 'http://127.0.0.1:4321',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
        'content-type': 'application/json',
      },
      body: JSON.stringify([
        { share_token: 'm13-public', visibility: 'public', revoked_at: null },
      ]),
    }),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/badge?id=${AUDIT_ID}&theme=light`);
  const stage = page.locator('.stage');
  await expect(stage.locator('b')).toBeVisible({ timeout: 15_000 });
  await expect(stage.locator('img')).toBeVisible();
  // Complet : logo, libellé et note.
  await expect(stage).toContainText('Audité par Audixio');
  await expect(stage.locator('b')).toHaveText('B');
  await expect(stage.locator('b')).toBeVisible();
  await page.getByRole('radio', { name: /^Compact/ }).check();
  // Compact : logo et « Audixio : B ».
  await expect(stage.locator('img')).toBeVisible();
  await expect(stage).toHaveText(/Audixio\s*:\s*B/);
  await expect(page.locator('#code')).toHaveValue(/Audixio : B/);
  await expect(page.locator('#code')).toHaveValue(/\/partage\/m13-public/);
});

test('B-4 : /domaine Sécurité à 330 px en EN, le texte reste dans la carte de note', async ({
  page,
}) => {
  await verifiedReport(page, 86, { securite: 55 });
  await page.setViewportSize({ width: 330, height: 900 });
  await page.goto(
    `/domaine?id=${AUDIT_ID}&domaine=securite&theme=light&lang=en`,
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.gcard')).toContainText(
    'Some protections can be strengthened.',
  );
  const out = await page.evaluate<string[]>(`(() => {
    const card = document.querySelector('.gcard').getBoundingClientRect();
    const res = [];
    for (const el of document.querySelectorAll('.gcard .gtop h2, .gcard .gtop p')) {
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects())
        if (r.width && (r.right > card.right + 0.5 || r.left < card.left - 0.5))
          res.push(el.textContent.trim() + ' ' + Math.round(r.right) + ' > ' + Math.round(card.right));
    }
    return res;
  })()`);
  expect(out).toEqual([]);
});

test('B-5 : /rapport sombre à 330 px, la note 86/100 se lit sur le disque blanc', async ({
  page,
}) => {
  await verifiedReport(page);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 330, height: 900 });
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=dark`);
  const score = page.locator('#rose .c-score');
  await expect(score).toHaveText('86/100', { timeout: 15_000 });
  const fill = await page.evaluate<string>(
    `getComputedStyle(document.querySelector('#rose .c-score')).fill`,
  );
  // Disque central blanc (#gDisc) : contraste mesuré contre le blanc.
  const [r, g, b] = (fill.match(/\d+/g) ?? []).map(Number);
  const lin = (v = 0): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  expect(1.05 / (lum + 0.05)).toBeGreaterThanOrEqual(4.5);
});

// Contraste de chaque texte de la fenêtre Partager contre son fond effectif.
const SHEET_CONTRAST = `(() => {
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const out = [];
  for (const el of document.querySelectorAll('.sh-dlg *')) {
    if (el.childElementCount || !el.textContent.trim() || el.closest('.sr-only')) continue;
    let a = el, bg = null;
    while (a) { const c = rgb(getComputedStyle(a).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c; break; } a = a.parentElement; }
    const fg = rgb(getComputedStyle(el).webkitTextFillColor || getComputedStyle(el).color);
    const [hi, lo] = [lum(fg), lum(bg || [255, 255, 255])].sort((x, y) => y - x);
    const ratio = (hi + 0.05) / (lo + 0.05);
    if (ratio < 4.5) out.push(el.textContent.trim().slice(0, 40) + ' ' + ratio.toFixed(2));
  }
  return out;
})()`;

test('B-6 : fenêtre Partager en sombre (thème choisi dans le menu), sous-titre du badge lisible', async ({
  page,
}) => {
  await verifiedReport(page);
  await page.route('**/api/liens**', (route) => {
    const write = route.request().method().toLowerCase() === 'post';
    return route.fulfill({
      status: write ? 201 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        write
          ? { id: 'lien-1', url: '/partage/k7Qm2xVaPq9Zt3Lw' }
          : { liens: [] },
      ),
    });
  });
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto(`/rapport?id=${AUDIT_ID}&lang=en`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForLoadState('networkidle');
  // Comme Mo : thème sombre choisi depuis le menu du haut.
  await page.locator('.axn-burger').click();
  await page.locator('.axn-theme:visible').first().click();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#shareBtn').click();
  const sheet = page.locator('.sh-dlg');
  await expect(sheet).toContainText('Show your grade on your site.');
  await page.waitForTimeout(600);
  expect(await page.evaluate<string[]>(SHEET_CONTRAST)).toEqual([]);
  await sheet.locator('.sh-main').click();
  await expect(sheet).toContainText('Public link created.');
  expect(await page.evaluate<string[]>(SHEET_CONTRAST)).toEqual([]);
});

test('B-7 : /pro à 330 px en EN, l’illustration du badge montre « PRO » en entier', async ({
  page,
}) => {
  await page.setViewportSize({ width: 330, height: 900 });
  await page.goto('/pro?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForLoadState('networkidle');
  const badge = page.locator('.ill .bm .pbadge');
  await expect(badge).toHaveText('PRO');
  await badge.scrollIntoViewIfNeeded();
  const geo = await page.evaluate<{
    squeezed: number;
    inside: boolean;
  }>(`(() => {
    const badge = document.querySelector('.ill .bm .pbadge');
    const b = badge.getBoundingClientRect();
    const ill = badge.closest('.ill').getBoundingClientRect();
    const bm = badge.closest('.bm').getBoundingClientRect();
    return {
      squeezed: badge.scrollWidth - badge.clientWidth,
      inside: b.left >= bm.left - 0.5 && b.right <= bm.right + 0.5 && bm.right <= ill.right + 0.5 && bm.left >= ill.left - 0.5,
    };
  })()`);
  expect(geo.squeezed).toBeLessThanOrEqual(1);
  expect(geo.inside).toBe(true);
});

test('B-9 : /robot en sombre, l’exemple robots.txt n’est plus lavande clair', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/robot?theme=dark');
  const box = page.locator('#robots pre');
  await expect(box).toContainText('User-agent');
  const colors = await page.evaluate<{ bg: string; fg: string }>(`(() => {
    const pre = document.querySelector('#robots pre');
    const code = pre.querySelector('code') || pre;
    return { bg: getComputedStyle(pre).backgroundColor, fg: getComputedStyle(code).color };
  })()`);
  expect(colors.bg).toBe('rgb(28, 35, 64)');
  expect(colors.fg).toBe('rgb(240, 242, 245)');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/robot?theme=light');
  await expect(box).toHaveCSS('background-color', 'rgb(237, 232, 245)');
});
