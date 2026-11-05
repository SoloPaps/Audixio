import { expect, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('/compte EN : « Coming soon » sans pluriel fautif', async ({ page }) => {
  await stubSession(page);
  await page.goto('/compte?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toContainText('Coming soon');
  await expect(page.locator('main')).not.toContainText('Coming soons');
});
