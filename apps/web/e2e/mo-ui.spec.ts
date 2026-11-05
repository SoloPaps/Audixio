import { expect, test } from '@playwright/test';

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
