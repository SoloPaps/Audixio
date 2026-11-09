import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './en-session.js';

const CORS = {
  'access-control-allow-origin': 'http://127.0.0.1:4321',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'content-type': 'application/json',
};

async function oneSite(page: Page): Promise<void> {
  await page.route('http://127.0.0.1:54321/rest/v1/sites**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 200,
          headers: CORS,
          body: JSON.stringify([
            {
              id: '33333333-3333-4333-8333-333333333333',
              url: 'https://bon.audigy.test',
              label: 'bon.audigy.test',
              host: 'bon.audigy.test',
              is_public: false,
              public_slug: null,
              expose_security: false,
            },
          ]),
        }),
  );
}

// QA Mo 05/11, thème ui-mobile-i18n.

test('B9 (bug_db548bd2) : /sites en anglais, titre « Why monitor your domains? » sans français', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await oneSite(page);
  await page.goto('/sites?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('heading', { name: 'Why monitor your domains?' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Pourquoi surveiller')).toHaveCount(0);
});
