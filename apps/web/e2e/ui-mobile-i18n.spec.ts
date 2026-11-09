import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

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

test('B10 (bug_b3d701fc) : contact en anglais, motif entièrement anglais et lisible à 330 px', async ({
  page,
}) => {
  await stubSession(page, 'free');
  await page.setViewportSize({ width: 330, height: 800 });
  await page.goto('/compte?theme=light&lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const reason = page.locator('select#mot');
  await expect(reason.locator('option').first()).toHaveText(
    'Question about a security audit',
    { timeout: 15_000 },
  );
  const options = await reason.locator('option').allTextContents();
  for (const text of options) {
    expect(text).not.toMatch(/\b(un|de|sur|sécurité|diagnostic)\b/);
  }
  await reason.scrollIntoViewIfNeeded();
  const box = await reason.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(330);
});

for (const lang of ['en', 'fr'] as const) {
  test(`B7 (bug_bbf3506c) : le point du consentement reste sur la ligne du lien (${lang})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    if (lang === 'en') {
      await page.goto('/bienvenue?theme=dark');
      await toEnglish(page);
    }
    for (const width of [1920, 1280, 330]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/inscription?theme=dark');
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const label = page.locator('.auth-card .chk').filter({
        has: page.locator('a[href="/confidentialite"]'),
      });
      await expect(label).toBeVisible({ timeout: 15_000 });
      const lines = await label.evaluate((node) => {
        const doc = (node as unknown as { ownerDocument: unknown })
          .ownerDocument as {
          createRange: () => {
            setStart: (n: unknown, o: number) => void;
            setEnd: (n: unknown, o: number) => void;
            getBoundingClientRect: () => { top: number; bottom: number };
          };
        };
        const root = node as unknown as {
          querySelector: (s: string) => {
            nextSibling: { textContent: string } | null;
            getBoundingClientRect: () => { top: number; bottom: number };
          };
          getBoundingClientRect: () => { right: number };
        };
        const link = root.querySelector('a[href="/confidentialite"]');
        const dot = link.nextSibling;
        if (!dot || dot.textContent !== '.') return null;
        const range = doc.createRange();
        range.setStart(dot, 0);
        range.setEnd(dot, 1);
        const a = link.getBoundingClientRect();
        const b = range.getBoundingClientRect();
        return {
          linkTop: a.top,
          linkBottom: a.bottom,
          dotTop: b.top,
          dotBottom: b.bottom,
        };
      });
      expect(lines, `${lang} ${width}`).not.toBeNull();
      // Le point se trouve dans la hauteur de la dernière ligne du lien.
      expect(lines?.dotTop ?? 0, `${lang} ${width}`).toBeGreaterThanOrEqual(
        (lines?.linkTop ?? 0) - 1,
      );
      expect(lines?.dotBottom ?? 0, `${lang} ${width}`).toBeLessThanOrEqual(
        (lines?.linkBottom ?? 0) + 1,
      );
      const overflow = await page.evaluate(
        () =>
          (
            globalThis as unknown as {
              document: { documentElement: { scrollWidth: number } };
              innerWidth: number;
            }
          ).document.documentElement.scrollWidth -
          (globalThis as unknown as { innerWidth: number }).innerWidth,
      );
      expect(overflow, `${lang} ${width}`).toBeLessThanOrEqual(0);
    }
  });
}
