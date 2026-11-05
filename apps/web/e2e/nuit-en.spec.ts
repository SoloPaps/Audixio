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

test('/mentions-legales EN : le toast de copie est en anglais', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/mentions-legales?theme=light');
  await toEnglish(page);
  await page.locator('button.copy').first().click();
  await expect(
    page.getByText('Address copied: Audixio@outlook.fr').first(),
  ).toBeAttached();
  await expect(page.getByText('Adresse copiée')).toHaveCount(0);
});

test('/progression EN : les compteurs sont en anglais', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/progression?theme=light');
  await toEnglish(page);
  const counts = page.locator('#counts');
  await expect(counts).toContainText('in progress');
  await expect(counts).toContainText('domains');
  await expect(counts).not.toContainText(
    /en cours|terminé|en attente|domaines/,
  );
});

test('/ EN : l’étiquette d’exemple suit l’ordre anglais', async ({ page }) => {
  await page.goto('/?theme=light');
  await toEnglish(page);
  await expect(page.locator('#rep-tag')).toHaveText('Illustrative example');
});
