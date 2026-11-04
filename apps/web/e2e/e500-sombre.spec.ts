import { expect, test } from '@playwright/test';

test('les cartes de /500 restent arrondies en sombre (bug #87)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/500?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.cards .card a').first()).toBeVisible();
  const square = await page.evaluate<string[]>(`(() => {
    const out = [];
    for (const card of document.querySelectorAll('.cards .card')) {
      const own = getComputedStyle(card);
      const link = card.querySelector('a');
      if (!link) continue;
      const opaque = own.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const inner = parseFloat(getComputedStyle(link).borderTopLeftRadius);
      if (opaque && parseFloat(own.borderTopLeftRadius) < inner) {
        out.push(link.textContent.trim().slice(0, 30));
      }
    }
    return out;
  })()`);
  expect(square).toEqual([]);
});
