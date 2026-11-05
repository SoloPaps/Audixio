import { expect, test } from '@playwright/test';
import { openHistory } from './h-history.js';

// QA Mo 05/11 M4 : la ligne « Seuil rang B (70) » suit l’échelle de la courbe.

test('M4 : le seuil 70 est tracé entre les graduations 60 et 75', async ({
  page,
}) => {
  await openHistory(page, [64, 86]);
  await expect(page.locator('text.val').nth(1)).toHaveText('86', {
    timeout: 15_000,
  });
  const ticks = page.locator('#chart .grid text');
  await expect(ticks.nth(0)).toHaveText('60');
  const bottom = Number(
    await page.locator('#chart .grid line').nth(0).getAttribute('y1'),
  );
  const mid = Number(
    await page.locator('#chart .grid line').nth(1).getAttribute('y1'),
  );
  const line = page.locator('#chart .thr line');
  // Ligne horizontale : boîte de hauteur nulle, on vérifie qu’elle n’est pas masquée.
  await expect(page.locator('#chart .thr')).not.toHaveCSS('display', 'none');
  await expect(page.locator('#chart .thr text')).toBeVisible();
  const y = Number(await line.getAttribute('y1'));
  expect(y).toBeLessThan(bottom);
  expect(y).toBeGreaterThan(mid);
  const low = Number(
    await page.locator('#chart g.pt circle.dot').nth(0).getAttribute('cy'),
  );
  expect(low).toBeGreaterThan(y);
});
