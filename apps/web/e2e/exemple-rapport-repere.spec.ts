import { expect, test } from '@playwright/test';

// Attend que le défilement doux s’arrête, puis mesure l’écart sous la barre fixe.
const GAP_AFTER_SCROLL = `new Promise((resolve) => {
  let last = Number.NaN;
  let still = 0;
  const step = () => {
    if (window.scrollY === last) still += 1;
    else still = 0;
    last = window.scrollY;
    if (still < 10) return window.requestAnimationFrame(step);
    const bar = document.querySelector('.axn')?.getBoundingClientRect();
    const row = document.getElementById('prio-2')?.getBoundingClientRect();
    resolve(bar && row ? Math.round(row.top - bar.bottom) : -1);
  };
  window.requestAnimationFrame(step);
})`;

test('le repère 2 amène sa priorité sous la barre fixe (bug #97)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=dark');
  await page.evaluate("document.querySelector('a.pin.p2').click()");
  await expect(page).toHaveURL(/#prio-2$/);
  expect(await page.evaluate<number>(GAP_AFTER_SCROLL)).toBeGreaterThanOrEqual(
    0,
  );
});
