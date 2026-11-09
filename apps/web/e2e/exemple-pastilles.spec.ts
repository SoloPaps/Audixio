import { expect, type Page, test } from '@playwright/test';

/**
 * Exemple de rapport : la pastille Rien / À vérifier / À corriger suit le
 * libellé coché, aussi en anglais (Nothing / To check / To fix), où les
 * libellés n’ont pas la largeur française. Avant : la pastille gardait la
 * place du français et chevauchait « To check » en débordant du rail.
 */

type Box = { left: number; right: number };
type Painted = {
  querySelectorAll: (selector: string) => Iterable<Painted>;
  querySelector: (selector: string) => Painted | null;
  getBoundingClientRect: () => Box;
};

async function english(page: Page): Promise<void> {
  const pack = await (await page.request.get('/dictionnaire-en.json')).text();
  await page.addInitScript((value) => {
    const store = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    store.setItem('audigy-en', value);
    store.setItem('audigy-locale', 'en');
  }, pack);
}

async function offsets(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const doc = (globalThis as unknown as { document: Painted }).document;
    const out: number[] = [];
    for (const seg of doc.querySelectorAll('.cst .seg')) {
      const ind = seg.querySelector('.ind');
      const on = seg.querySelector('label:has(input:checked)');
      if (!ind || !on) continue;
      const a = ind.getBoundingClientRect();
      const b = on.getBoundingClientRect();
      const rail = seg.getBoundingClientRect();
      out.push(
        Math.max(
          Math.abs(a.left - b.left),
          Math.abs(a.right - b.right),
          Math.max(0, a.right - rail.right),
        ),
      );
    }
    return out;
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`pastilles de statut alignées en anglais (${theme})`, async ({
    page,
  }) => {
    await english(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/exemple-rapport?theme=${theme}`);
    const first = page.locator('.cst .seg').first();
    await expect(first.locator('label.o-fix')).toHaveText('To fix');
    await first.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => Math.max(...(await offsets(page))))
      .toBeLessThan(2);
    await first.locator('label.o-chk').click();
    await expect
      .poll(async () => Math.max(...(await offsets(page))))
      .toBeLessThan(2);
  });
}

test('pastilles de statut alignées en français', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/exemple-rapport?theme=light');
  await expect(page.locator('.cst .seg label.o-fix').first()).toHaveText(
    'À corriger',
  );
  await expect
    .poll(async () => Math.max(...(await offsets(page))))
    .toBeLessThan(2);
});
