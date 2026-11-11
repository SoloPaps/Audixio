import { expect, test } from '@playwright/test';

// Retour owner du 11 nov. : « vérifie qu'il s'affiche bien au lancement ».
// Première visite (stockage vide), thème du système, mobile et bureau :
// la boîte de choix cookies s'affiche entière, dans le bon thème dès le
// premier rendu, sans décalage de mise en page ; le choix est retenu.

const SIZES = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;

for (const scheme of ['light', 'dark'] as const) {
  for (const size of SIZES) {
    test(`/cookies au lancement (${scheme}, ${size.width} px)`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(size);
      await page.addInitScript(() => {
        const host = globalThis as unknown as {
          __shift: number;
          __firstTheme: string | null;
          PerformanceObserver: new (
            cb: (list: {
              getEntries: () => { value: number; hadRecentInput: boolean }[];
            }) => void,
          ) => { observe: (o: unknown) => void };
          document: {
            documentElement: { getAttribute: (n: string) => string | null };
            addEventListener: (n: string, f: () => void) => void;
          };
        };
        host.__shift = 0;
        host.__firstTheme = null;
        new host.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) host.__shift += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        host.document.addEventListener('DOMContentLoaded', () => {
          host.__firstTheme =
            host.document.documentElement.getAttribute('data-theme');
        });
      });
      await page.goto('/cookies');
      const dialog = page.getByRole('dialog', {
        name: 'Vos choix sur les cookies',
      });
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeInViewport({ ratio: 1 });
      for (const name of ['Tout accepter', 'Tout refuser', 'Personnaliser']) {
        await expect(page.getByRole('button', { name })).toBeInViewport();
      }
      await page.waitForTimeout(900);
      const seen = await page.evaluate(() => {
        const host = globalThis as unknown as {
          __shift: number;
          __firstTheme: string | null;
        };
        return { shift: host.__shift, first: host.__firstTheme };
      });
      // Thème du système posé avant le premier rendu : pas de flash clair.
      expect(seen.first).toBe(scheme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      expect(seen.shift).toBeLessThan(0.05);
    });
  }
}

test('/cookies : le choix est retenu à la visite suivante', async ({
  page,
}) => {
  await page.goto('/cookies');
  await page.locator('#ps').click();
  await page.locator('#pref').check();
  await page.getByRole('button', { name: 'Tout refuser' }).click();
  await expect(page.locator('#st')).toHaveText(
    'Refus enregistré : seuls les cookies nécessaires sont utilisés.',
  );
  await page.goto('/cookies');
  await expect(page.locator('#pref')).not.toBeChecked();
  await page.getByRole('button', { name: 'Tout accepter' }).click();
  await page.goto('/cookies');
  await expect(page.locator('#pref')).toBeChecked();
});
