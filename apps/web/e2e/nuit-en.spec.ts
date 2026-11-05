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

test('/compte/alertes EN : titre entièrement anglais', async ({ page }) => {
  await stubSession(page);
  await page.goto('/compte/alertes?theme=light');
  await toEnglish(page);
  await expect(page.locator('h1')).toHaveText('Settings for alerts');
});

test('/accessibilite EN : plus de « Le Défenseur des droits » en français', async ({
  page,
}) => {
  await page.goto('/accessibilite?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toContainText('The Défenseur des droits');
  await expect(page.locator('main')).not.toContainText(
    'Le Défenseur des droits',
  );
});

test('/mentions-legales EN : « browser » n’est pas répété autour de localStorage', async ({
  page,
}) => {
  await page.goto('/mentions-legales?theme=light');
  await toEnglish(page);
  await expect(page.locator('main')).toContainText(
    'stored only in the localStorage of your browser.',
  );
  await expect(page.locator('main')).not.toContainText('browser’s');
});
