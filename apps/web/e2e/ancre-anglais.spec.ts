import { expect, test } from '@playwright/test';

test("l'ancre #audit-form reste sous la barre en anglais (bug #118)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?theme=light');
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.setViewportSize({ width: 330, height: 900 });
  await page.goto('/#audit-form');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.evaluate(`new Promise((done) => {
    let last = -1;
    let still = 0;
    const tick = () => {
      if (window.scrollY === last) still += 1;
      else still = 0;
      last = window.scrollY;
      if (still >= 30) done(null);
      else window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  })`);
  const gap = await page.evaluate<number>(`(() => {
    const label = document.querySelector('#audit-form label');
    const bar = document.querySelector('.site-bar');
    return label.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
  })()`);
  expect(gap).toBeGreaterThanOrEqual(0);
});
