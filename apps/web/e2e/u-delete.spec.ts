import { expect, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

// U2 : confirmation de suppression du compte, mot selon la langue active.

test('U2 : en français, seul « supprimer » arme la suppression', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/compte?theme=light');
  await page.locator('#del').click();
  const dialog = page.locator('#dlg');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#dlgd b')).toHaveText('supprimer');
  const ok = page.locator('#dok');
  await page.locator('#cfm').fill('delete');
  await expect(ok).toBeDisabled();
  await page.locator('#cfm').fill('supprimer');
  await expect(ok).toBeEnabled();
});

test('U2 : en anglais, « delete » arme la suppression, jeton API inchangé', async ({
  page,
}) => {
  await stubSession(page);
  const bodies: unknown[] = [];
  await page.route('**/api/compte/suppression', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ deleted: true }),
    });
  });
  await page.goto('/compte?theme=light');
  await toEnglish(page);
  await page.locator('#del').click();
  const dialog = page.locator('#dlg');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#dlgd b')).toHaveText('delete');
  await expect(dialog).not.toContainText('supprimer');
  const ok = page.locator('#dok');
  await page.locator('#cfm').fill('delet');
  await expect(ok).toBeDisabled();
  await page.locator('#cfm').fill(' Delete ');
  await expect(ok).toBeEnabled();
  await ok.click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual({ confirm: 'supprimer' });
});
