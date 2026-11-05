import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openHistory } from './h-history.js';

// U1 : choix du format d’export sur /historique, selon la matrice des droits.

test('U1 : un compte gratuit exporte en CSV ou PDF, Excel reste un appel Pro', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  await expect(page.locator('table tbody')).toContainText('88', {
    timeout: 15_000,
  });
  const trigger = page.locator('#hexpb');
  const menu = page.locator('#hexpm');
  await expect(menu).toBeHidden();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.locator('[data-hfmt="csv"]')).toBeVisible();
  await expect(menu.locator('[data-hfmt="pdf"]')).toBeVisible();
  await expect(menu.locator('[data-hfmt="xlsx"]')).toHaveCount(0);
  await expect(menu.locator('[data-hfmt="json"]')).toHaveCount(0);
  const cta = menu.locator('.pro-cta a');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/pro');
  await expect(cta).toContainText('Excel');
  await expect(cta).toContainText('JSON');
  await expect(cta).toContainText('Pro');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    menu.locator('[data-hfmt="pdf"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    'audixio-historique-bon.audigy.test.pdf',
  );
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
  const text = bytes.toString('latin1');
  expect(text).toContain('bon.audigy.test');
  expect(text).not.toContain('(72)');
  expect(text).toContain('(88)');
  await expect(page.locator('#toast')).toContainText(
    'Historique téléchargé (fichier PDF).',
  );
});

test('U1 : un compte Pro exporte aussi en Excel (.xlsx)', async ({ page }) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(1)).toHaveText('88', {
    timeout: 15_000,
  });
  await page.locator('#hexpb').click();
  const menu = page.locator('#hexpm');
  await expect(menu.locator('.pro-cta')).toHaveCount(0);
  const xlsx = menu.locator('[data-hfmt="xlsx"]');
  await expect(xlsx).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    xlsx.click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    'audixio-historique-bon.audigy.test.xlsx',
  );
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  const raw = bytes.toString('utf8');
  expect(raw).toContain('xl/worksheets/sheet1.xml');
  expect(raw).toContain('<v>72</v>');
  expect(raw).toContain('<v>88</v>');
  await expect(page.locator('#toast')).toContainText(
    'Historique téléchargé (fichier Excel).',
  );
});

test('U1 : en anglais, le menu d’export ne garde aucun français', async ({
  page,
}) => {
  await openHistory(page, [72, 88]);
  await page.goto(`${page.url()}&lang=en`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('table tbody')).toContainText('88', {
    timeout: 15_000,
  });
  await page.locator('#hexpb').click();
  const menu = page.locator('#hexpm');
  await expect(menu).toHaveAttribute('aria-label', 'Choose export format');
  await expect(menu.locator('[data-hfmt="csv"]')).toHaveText(
    'CSV (spreadsheet)',
  );
  await expect(menu.locator('[data-hfmt="pdf"]')).toHaveText('PDF (printable)');
});

test('U1b : un compte Pro exporte aussi en JSON', async ({ page }) => {
  await openHistory(page, [72, 88], 'light', 'bon.audigy.test', 'pro');
  await expect(page.locator('text.val').nth(1)).toHaveText('88', {
    timeout: 15_000,
  });
  await page.locator('#hexpb').click();
  const json = page.locator('#hexpm [data-hfmt="json"]');
  await expect(json).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    json.click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    'audixio-historique-bon.audigy.test.json',
  );
  const body = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    format: string;
    site: string;
    audits: { scores: Record<string, number | null> }[];
  };
  expect(body.format).toBe('audixio-historique');
  expect(body.site).toBe('bon.audigy.test');
  expect(body.audits.map((audit) => audit.scores.global)).toEqual([72, 88]);
  await expect(page.locator('#toast')).toContainText(
    'Historique téléchargé (fichier JSON).',
  );
});
