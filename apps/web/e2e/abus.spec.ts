import { expect, test } from '@playwright/test';

test('le formulaire robot dit quand la demande est refusée', async ({
  page,
}) => {
  await page.route('**/api/robot', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'retry-after': '3600' },
      body: JSON.stringify({
        error: 'rate_limited',
        messageKey: 'api.error.rate_limited',
      }),
    }),
  );
  await page.goto('/robot');
  await page.locator('#oo-d').fill('exemple.fr');
  await page.locator('#oo-m').fill('ada@exemple.fr');
  await page.locator('#oo button[type="submit"]').click();
  await expect(page.locator('#oo-st')).toHaveText(
    'Trop de demandes. Réessayez plus tard.',
  );
});

test('le formulaire robot confirme une demande acceptée', async ({ page }) => {
  let body = '';
  await page.route('**/api/robot', async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, messageKey: 'api.intake.accepted' }),
    });
  });
  await page.goto('/robot');
  await page.locator('#oo-d').fill('exemple.fr');
  await page.locator('#oo-m').fill('ada@exemple.fr');
  await page.locator('#oo button[type="submit"]').click();
  await expect(page.locator('#oo-st')).toContainText(
    'Demande reçue. Elle sera examinée après une preuve de propriété.',
  );
  await expect(page.locator('#oo-st')).toContainText('ada@exemple.fr');
  await expect(page.locator('#oo-st')).toContainText('exemple.fr');
  expect(body).toContain('exemple.fr');
  expect(body).toContain('ada@exemple.fr');
});

test('la demande d’accès dit quand elle est refusée', async ({ page }) => {
  await page.route('**/api/demandes-acces', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'rate_limited' }),
    }),
  );
  await page.goto('/demande-acces');
  await page.locator('#owner-email').fill('ada@exemple.fr');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#live')).toHaveText(
    'Trop de demandes. Réessayez plus tard.',
  );
});

test('la demande d’accès confirme l’envoi', async ({ page }) => {
  await page.route('**/api/demandes-acces', (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    }),
  );
  await page.goto('/demande-acces');
  await page.locator('#owner-email').fill('ada@exemple.fr');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#live')).toHaveText(
    'Demande envoyée au propriétaire de exemple.fr',
  );
});
