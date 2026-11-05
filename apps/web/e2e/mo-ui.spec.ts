import { expect, test } from '@playwright/test';
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
