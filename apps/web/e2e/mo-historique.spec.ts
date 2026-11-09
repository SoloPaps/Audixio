import { expect, test } from '@playwright/test';
import { openHistory } from './h-history.js';

// QA Mo 05/11 M4 : la ligne du seuil de rang B suit l’échelle de la courbe.
// QA Mo 05/11 M1 (bug_22d8d4f1) : ce seuil est 80, comme le barème (B = 80 à 89).

test('M1/M4 : le seuil B (80) est tracé entre les graduations 75 et 90', async ({
  page,
}) => {
  await openHistory(page, [64, 86], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(1)).toHaveText('86', {
    timeout: 15_000,
  });
  const ticks = page.locator('#chart .grid text');
  await expect(ticks.nth(0)).toHaveText('60');
  await expect(ticks.nth(1)).toHaveText('75');
  await expect(ticks.nth(2)).toHaveText('90');
  const mid = Number(
    await page.locator('#chart .grid line').nth(1).getAttribute('y1'),
  );
  const top = Number(
    await page.locator('#chart .grid line').nth(2).getAttribute('y1'),
  );
  const line = page.locator('#chart .thr line');
  // Ligne horizontale : boîte de hauteur nulle, on vérifie qu’elle n’est pas masquée.
  await expect(page.locator('#chart .thr')).not.toHaveCSS('display', 'none');
  await expect(page.locator('#chart .thr text')).toHaveText(
    'Seuil rang B (80)',
  );
  const y = Number(await line.getAttribute('y1'));
  expect(y).toBeLessThan(mid);
  expect(y).toBeGreaterThan(top);
  const dots = page.locator('#chart g.pt circle.dot');
  expect(Number(await dots.nth(0).getAttribute('cy'))).toBeGreaterThan(y);
  expect(Number(await dots.nth(1).getAttribute('cy'))).toBeLessThan(y);
});

test('M1 (bug_22d8d4f1) : un audit à 78 est C, sous la ligne B (80)', async ({
  page,
}) => {
  await openHistory(page, [78, 86], 'light', 'bon.audigy.test', 'pro');
  // La maquette statique affiche déjà 78 et la graduation 80 : on attend le
  // journal réel (deux lignes) avant de lire le graphique.
  await expect(page.getByRole('cell', { name: 'B · 86' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('text.val')).toHaveCount(2);
  // Échelle 70–90 : la ligne B se pose sur la graduation 80.
  await expect(page.locator('#chart .grid text').nth(1)).toHaveText('80');
  const line = page.locator('#chart .thr line');
  const tick = page.locator('#chart .grid line').nth(1);
  await expect
    .poll(async () =>
      Math.abs(
        Number(await line.getAttribute('y1')) -
          Number(await tick.getAttribute('y1')),
      ),
    )
    .toBeLessThan(0.11);
  const y = Number(await line.getAttribute('y1'));
  const low = Number(
    await page.locator('#chart g.pt circle.dot').nth(0).getAttribute('cy'),
  );
  expect(low).toBeGreaterThan(y);
  // Le journal note 78 en C, comme le graphique et le barème.
  await expect(page.getByRole('cell', { name: 'C · 78' })).toBeVisible();
});
