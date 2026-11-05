import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openHistory } from './h-history.js';

// QA Mo 05/11 : exports.

test('M7 : « Exporter » de /historique télécharge l’historique en CSV', async ({
  page,
}) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(1)).toHaveText('88', {
    timeout: 15_000,
  });
  // U1 : « Exporter » ouvre désormais le choix du format ; CSV inchangé.
  await page.locator('#hexpb').click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    page.locator('#hexpm [data-hfmt="csv"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    'audixio-historique-bon.audigy.test.csv',
  );
  const path = await download.path();
  const text = (await readFile(path, 'utf8')).replace(/^\uFEFF/u, '');
  const lines = text.trim().split(/\r\n/u);
  expect(lines[0]).toMatch(/^Date;/u);
  expect(lines).toHaveLength(3);
  expect(lines[1]).toContain('72');
  expect(lines[2]).toContain('88');
  await expect(page.locator('#toast')).toContainText(
    'Historique téléchargé (fichier CSV).',
  );
});
