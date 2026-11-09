import { expect, type Page, test } from '@playwright/test';

// La rosace de /exemple-rapport écrivait ses textes en français dans le script
// inline (« Note globale », « domaines testés »…). Ils viennent du catalogue.

async function english(page: Page): Promise<void> {
  await page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

async function expectEnglishRose(page: Page): Promise<void> {
  await expect(page.locator('#roseT')).toHaveText(
    'Overall grade B, average of the 7 areas tested out of 8',
    { timeout: 15_000 },
  );
  await expect(page.locator('#roseD')).toHaveText(
    /^Score rose by area: .+, .+ not tested\.$/,
  );
  await expect(page.locator('text.c-label')).toHaveText('Overall grade');
  await expect(page.locator('text.c-score')).toHaveText('7 areas tested');
  for (const node of ['#roseT', '#roseD', 'text.c-label', 'text.c-score']) {
    await expect(page.locator(node)).not.toHaveText(
      /Note globale|domaines testés|non testé|Rose des scores/,
    );
  }
}

test('rosace de l’exemple : textes du catalogue en français', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=light');
  await expect(page.locator('#roseT')).toHaveText(
    'Note globale B, moyenne des 7 domaines testés sur 8',
    { timeout: 15_000 },
  );
  await expect(page.locator('#roseD')).toHaveText(
    /^Rose des scores par domaine : .+, Vie privée non testé\.$/,
  );
  await expect(page.locator('text.c-label')).toHaveText('Note globale');
  await expect(page.locator('text.c-score')).toHaveText('7 domaines testés');
});

test('rosace de l’exemple : anglais au changement de langue et après rechargement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/exemple-rapport?theme=light');
  await expect(page.locator('#roseT')).toBeAttached({ timeout: 15_000 });
  await english(page);
  await expectEnglishRose(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectEnglishRose(page);
});
