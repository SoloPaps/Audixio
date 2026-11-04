import { expect, type Page, test } from '@playwright/test';

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    'document.querySelectorAll("astro-island").length > 0 && [...document.querySelectorAll("astro-island")].every((node) => !node.hasAttribute("ssr"))',
  );
}

test('les blocs légaux se révèlent et la copie confirme l’adresse', async ({
  page,
}) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/mentions-legales?theme=light');
  await ready(page);
  await expect(page.locator('.rv.in').first()).toBeVisible();
  await page.getByRole('button', { name: 'Copier l’adresse' }).click();
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#toast')).toContainText(
    'Adresse copiée : Audixio@outlook.fr',
  );
  await expect(page.locator('.copy.done').first()).toBeVisible();
});

test('le sommaire marque le chapitre et la barre de lecture avance', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/mentions-legales?theme=light');
  await ready(page);
  const link = page.locator('.toc a[href="#signalement"]');
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(() =>
      page.evaluate(
        '(() => { const node = document.querySelector(".progress"); return Number(getComputedStyle(node).getPropertyValue("--p")); })()',
      ),
    )
    .toBeGreaterThan(0.2);
});

test('le survol incline une tuile et le compteur atteint sa cible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/robot?theme=light');
  await ready(page);
  const count = page.locator('[data-count="50"]');
  await expect(count).toHaveAttribute('data-done', '1');
  await expect(count).toHaveText('50');
  const card = page.locator('.tilt').first();
  await card.hover();
  await expect
    .poll(() =>
      page.evaluate(
        '(() => document.querySelector(".tilt").style.transform)()',
      ),
    )
    .toContain('rotateX');
  await card.dispatchEvent('pointerleave');
});

test('le focus clavier pose un contour visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/cookies?theme=light');
  await ready(page);
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(
    '(() => { const el = document.activeElement; if (!el) return ""; const style = getComputedStyle(el); return style.outlineStyle + " " + style.outlineWidth; })()',
  );
  expect(outline).toMatch(/solid/);
  expect(outline).not.toMatch(/0px/);
});

test('le bandeau cookies ouvre le tiroir et annonce chaque choix', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/cookies?theme=light');
  await ready(page);
  const toggle = page.getByRole('button', { name: 'Personnaliser' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#pn')).toHaveClass(/open/);
  await page.getByRole('button', { name: 'Enregistrer mes choix' }).click();
  await expect(page.locator('#st')).toHaveText(
    'Vos choix ont été enregistrés.',
  );
  await page.getByRole('button', { name: 'Tout accepter' }).click();
  await expect(page.locator('#st')).toHaveText(
    'Préférences acceptées. Merci !',
  );
  await page.getByRole('button', { name: 'Tout refuser' }).click();
  await expect(page.locator('#st')).toHaveText(
    'Refus enregistré : seuls les cookies nécessaires sont utilisés.',
  );
});

test('l’échec d’audit change de cas puis relance', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/audit-echoue?maquette=1&theme=light');
  await ready(page);
  await expect(
    page.getByRole('heading', { name: 'n’a pas abouti' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Accès refusé (403)' }).click();
  await expect(page.getByRole('heading', { name: 'a bloqué' })).toBeVisible();
  await page.getByRole('button', { name: 'Site injoignable' }).click();
  await expect(page.getByRole('heading', { name: 'à joindre' })).toBeVisible();
  await page.getByRole('button', { name: 'Relancer l’audit' }).click();
  await expect(
    page.getByRole('button', { name: 'Relance en cours…' }),
  ).toBeVisible();
  await page.waitForURL('**/progression');
});

test('la recherche 404 vide les accès et le rejeu reste disponible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/404?theme=light');
  await ready(page);
  await expect(page.locator('#replay')).toBeVisible();
  await page.locator('#replay').click();
  await expect(page.locator('#vapor')).toBeVisible();
  await page.locator('#q').fill('zzzz-introuvable');
  await expect(page.locator('#noresult')).toHaveClass(/on/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/404?theme=light');
  await expect(page.locator('#fsize')).toHaveText('0 octet');
});

test('la maintenance fait tourner l’anneau et le 500 se recharge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/maintenance?theme=light');
  await ready(page);
  await expect(page.locator('#rstate')).toHaveText('réglage…');
  await expect
    .poll(async () => page.locator('#rstate').textContent(), { timeout: 8_000 })
    .toMatch(/ajustement…|vérification…/);
  await page.goto('/500?theme=light');
  await ready(page);
  await page.locator('#retryBtn').click();
  await expect(page.getByRole('heading', { name: 'perdu' })).toBeVisible();
});

test('le questionnaire éco compte, enregistre et reporte', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/ecoconception?theme=light');
  await ready(page);
  await page.locator('#f1 input[value="Oui"]').check();
  await expect(page.locator('#done')).toHaveText('1');
  await expect(page.locator('#prg')).toHaveText('1 question renseignée sur 6');
  await page.locator('#f2 input[value="Non"]').check();
  await expect(page.locator('#prg')).toHaveText(
    '2 questions renseignées sur 6',
  );
  await page.locator('#save').click();
  await expect(page.locator('#toast')).toContainText(
    'Réponses enregistrées dans ce navigateur',
  );
  await page.locator('#later').click();
  await expect(page.locator('#toast')).toContainText(
    'Vous pourrez reprendre le questionnaire plus tard',
  );
});

test('le formulaire robot refuse puis confirme', async ({ page }) => {
  await page.route('**/api/robot', (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    }),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/robot?theme=light');
  await ready(page);
  await page.locator('#oo button[type="submit"]').click();
  await expect(page.locator('#oo-st')).toHaveClass(/err/);
  await expect(page.locator('#oo-st')).toHaveText(
    'Indiquez un domaine et un e-mail valides.',
  );
  await page.locator('#oo-d').fill('exemple.fr');
  await page.locator('#oo-m').fill('vous@exemple.fr');
  await page.locator('#oo button[type="submit"]').click();
  await expect(page.locator('#oo-st')).toHaveClass(/ok/);
  await expect(page.locator('#oo-st')).toContainText('vous@exemple.fr');
  await expect(page.locator('#oo-st')).toContainText('exemple.fr');
});

test('le survol d’un lien d’audit le soulève', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/audit-echoue?maquette=1&theme=light');
  await ready(page);
  const link = page.locator('a.lk').first();
  const before = await page.evaluate(
    '(() => getComputedStyle(document.querySelector("a.lk")).transform)()',
  );
  await link.hover();
  await expect
    .poll(() =>
      page.evaluate(
        '(() => getComputedStyle(document.querySelector("a.lk")).transform)()',
      ),
    )
    .not.toBe(before);
});
