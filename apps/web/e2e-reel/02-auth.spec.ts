import { expect, test } from '@playwright/test';
import {
  AUTH,
  ageConfirmation,
  readState,
  waitMailLink,
  writeState,
} from './support.js';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const email = `e2e-${stamp}@exemple.test`;
const expiredEmail = `e2e-${stamp}-lien@exemple.test`;
const password = 'Audixio-10';
const nextPassword = 'Audixio-20';

test('mot de passe de 9 caractères refusé', async ({ page }) => {
  await page.goto('/inscription');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill('Audixio-9');
  await expect(
    page.getByText('Trop court : 10 caractères minimum.'),
  ).toBeVisible();
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/inscription\/?$/);
  const tooShort = await page.locator('#signup-password').evaluate((node) => {
    const field = node as unknown as { validity: { tooShort: boolean } };
    return field.validity.tooShort;
  });
  expect(tooShort).toBe(true);
});

test('inscription et lien de confirmation', async ({ page }) => {
  const after = Date.now();
  await page.goto('/inscription');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/envoye=1/);
  await expect(page.locator('#sub')).toHaveText('Confirmez votre adresse');
  const link = await waitMailLink(email, 'signup', after);
  await page.goto(link);
  await expect(page).toHaveURL(/\/email-confirme/);
  await expect(page.getByText('confirmée')).toBeVisible();
  await writeState({ email, password });
  await page.context().storageState({ path: AUTH });
});

test('déconnexion puis connexion', async ({ browser }) => {
  const context = await browser.newContext({ storageState: AUTH });
  const page = await context.newPage();
  await page.goto('/compte');
  await page.locator('#lo').click();
  await page.waitForURL('http://127.0.0.1:8888/');
  await page.goto('/connexion');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/sites/);
  await context.storageState({ path: AUTH });
  await context.close();
});

test('lien expiré puis renvoi', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const after = Date.now();
  await page.goto('/inscription');
  await page.locator('#signup-email').fill(expiredEmail);
  await page.locator('#signup-password').fill(password);
  await page.locator('input[name="terms"]').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/envoye=1/);
  const link = await waitMailLink(expiredEmail, 'signup', after);
  ageConfirmation(expiredEmail);
  await page.goto(link);
  await expect(page).toHaveURL(/erreur=lien/);
  await expect(page.getByText(/n.est plus valable/)).toBeVisible();
  const resent = Date.now();
  await page.locator('#login-email').fill(expiredEmail);
  await page.getByRole('button', { name: 'Renvoyer le lien' }).click();
  await expect(page).toHaveURL(/envoye=1/);
  await expect(
    page.getByText('Si le compte peut être créé, un message part.'),
  ).toBeVisible();
  const fresh = await waitMailLink(expiredEmail, 'signup', resent);
  await page.goto(fresh);
  await expect(page).toHaveURL(/\/email-confirme/);
  await context.close();
});

test('réinitialisation du mot de passe', async ({ page }) => {
  const after = Date.now();
  await page.goto('/reinitialisation');
  await page.locator('#reset-email').fill(email);
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page).toHaveURL(/envoye=1/);
  const link = await waitMailLink(email, 'recovery', after);
  await page.goto(link);
  await expect(page).toHaveURL(/etape=nouveau/);
  await page.locator('#new-password').fill(nextPassword);
  await page.locator('#confirm-password').fill(nextPassword);
  await page
    .getByRole('button', { name: 'Enregistrer le mot de passe' })
    .click();
  await page.waitForURL(/\/compte/);
  const state = await readState();
  await writeState({ ...state, password: nextPassword });
  await page.context().storageState({ path: AUTH });
});
