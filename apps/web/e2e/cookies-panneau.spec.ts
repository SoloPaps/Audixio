import { expect, test } from '@playwright/test';

// « Enregistrer mes choix » vivait dans le panneau replié de /cookies : invisible
// mais atteignable au clavier, et un clic n’y arrivait pas. Le panneau fermé est inerte.
test('/cookies : panneau fermé hors du clavier, ouvert il enregistre le choix', async ({
  page,
}) => {
  await page.goto('/cookies?theme=light');
  const panel = page.locator('#pn');
  await expect(panel).toHaveJSProperty('inert', true);
  // Au clavier, depuis « Personnaliser », on ne retombe jamais sur le panneau fermé.
  const reached: string[] = [];
  await page.locator('#ac').focus();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    reached.push(
      await page.evaluate<string>('document.activeElement?.id ?? ""'),
    );
  }
  expect(reached).not.toContain('sv');
  expect(reached).not.toContain('pref');

  await page.getByRole('button', { name: 'Personnaliser' }).click();
  await expect(panel).toHaveJSProperty('inert', false);
  await expect(page.locator('#pref')).toBeFocused();
  await page.locator('#sv').click();
  await expect(page.locator('#st')).not.toHaveText('');
  const saved = await page.evaluate<string | null>(
    "localStorage.getItem('audixio_consent')",
  );
  expect(saved).toContain('"pref":false');
});
