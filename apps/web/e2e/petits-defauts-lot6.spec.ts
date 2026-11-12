import { expect, test } from '@playwright/test';
import { stubSiteAccount } from './site-session.js';

// Lot 6, petits défauts relevés au lot 5 (un test par défaut).

const debords = `(() => [...document.querySelectorAll('main *')]
  .filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed';
  })
  .map((el) => el.tagName.toLowerCase() + '.' + [...el.classList].join('.')))()`;

for (const width of [390, 320]) {
  test(`/bienvenue à ${width} px : la lueur décorative reste dans la fenêtre`, async ({
    page,
  }) => {
    await stubSiteAccount(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/bienvenue?theme=light');
    await expect(page.locator('.bv .bv-bg')).toHaveCSS('overflow', 'hidden');
    // Laisse la lueur au bout de son animation (translate + scale).
    await page.waitForTimeout(400);
    expect(await page.evaluate<string[]>(debords)).toEqual([]);
  });
}
