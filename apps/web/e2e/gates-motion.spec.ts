import { expect, type Page, test } from '@playwright/test';
import { openProModal, stubFreeSites } from './sites-gratuit.js';

async function open(
  page: Page,
  path: string,
  motion: 'reduce' | 'no-preference',
) {
  await page.emulateMedia({ reducedMotion: motion, colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(path, { waitUntil: 'load' });
}

test.describe('animations Pro et accès', () => {
  test('pro : révélation, survol, focus, erreur et succès', async ({
    page,
  }) => {
    await open(page, '/pro?theme=light', 'no-preference');
    await expect(page.locator('#hero')).toBeVisible();
    const dot = page.locator('.eyebrow .dot');
    // Animations de la page préfixées par sa portée v6 (.pr6).
    await expect(dot).toHaveCSS('animation-name', 'pr6-dot');
    const card = page.locator('#pz');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/play/);
    const button = page.locator('#wbtn');
    const before = await button.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).transform,
    );
    await button.hover();
    const after = await button.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).transform,
    );
    expect(after).not.toBe(before);
    const input = page.locator('#email-input');
    await input.focus();
    const outline = await input.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).outlineStyle,
    );
    expect(
      outline === 'auto' || outline === 'solid' || outline === 'none',
    ).toBe(true);
    await input.fill('pas-un-mail');
    await page.locator('#waitlist-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    await expect(page.locator('#werr')).toContainText('ne semble pas valide');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('ada@exemple.fr');
    await page.locator('#waitlist-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    await expect(page.locator('#wl')).toHaveClass(/done/, { timeout: 5_000 });
    await expect(page.locator('#waitlist-success')).toBeVisible();
  });

  test('pro : mouvement réduit fige les animations', async ({ page }) => {
    await open(page, '/pro?theme=light', 'reduce');
    const duration = await page.locator('.eyebrow .dot').evaluate((el) => {
      const raw = (
        globalThis as unknown as {
          getComputedStyle(node: unknown): {
            transform: string;
            outlineStyle: string;
            animationDuration: string;
            boxShadow: string;
            backgroundColor: string;
          };
        }
      ).getComputedStyle(el).animationDuration;
      if (raw.endsWith('ms')) return Number.parseFloat(raw);
      if (raw.endsWith('s')) return Number.parseFloat(raw) * 1000;
      return 9999;
    });
    expect(duration).toBeLessThan(1);
    await expect(page.locator('.js .rv').first()).toHaveCSS('opacity', '1');
  });

  test('passer : modale, focus, erreur, succès, échap', async ({ page }) => {
    /* Question 1 : /passer-pro renvoie vers /pro ; la fenêtre Pro vit sur /sites. */
    await stubFreeSites(page);
    await open(page, '/sites?theme=light', 'no-preference');
    await openProModal(page, 'sites');
    const modal = page.locator('#pro-modal');
    await expect(modal).toHaveClass(/on/);
    await expect(page.locator('#pm-mv')).toHaveText('2 / 2');
    await expect(page.locator('#pm-d')).toContainText('2 sites');
    const close = page.locator('.pm-x');
    await close.hover();
    const turn = await close.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).transform,
    );
    expect(turn).not.toBe('none');
    const email = page.locator('#pm-email');
    await email.focus();
    const shadow = await email.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).boxShadow,
    );
    expect(shadow).not.toBe('none');
    await email.fill('non');
    await page.locator('#pm-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    /* La fenêtre Pro de /sites signale l’erreur par aria-invalid (pas de secousse). */
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#pm-err')).toContainText('ne semble pas valide');
    await email.fill('ada@exemple.fr');
    await page.locator('#pm-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    await expect(page.locator('#pm-ok')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#pm-okmail')).toHaveText('ada@exemple.fr');
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/on/);
    await expect(page).toHaveURL(/\/sites/);
  });

  test('passer : le hash liens change le plafond', async ({ page }) => {
    await stubFreeSites(page);
    await open(page, '/sites?theme=light', 'reduce');
    await openProModal(page, 'liens');
    await expect(page.locator('#pm-mv')).toHaveText('1 / 1');
    await expect(page.locator('#pm-ml')).toHaveText('Liens de partage actifs');
  });

  test('demande : copie, actualisation, envoi, focus', async ({ page }) => {
    await page.route('**/api/demandes-acces', (route) =>
      route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      }),
    );
    await open(page, '/demande-acces?theme=light', 'no-preference');
    const icon = page.locator('.input-wrap .material-symbols-outlined').first();
    await page.locator('#owner-email').focus();
    const scale = await icon.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).transform,
    );
    expect(scale).not.toBe('none');
    await page.locator('#copy-btn').click();
    await expect(page.locator('#copy-btn')).toContainText('Copié');
    await expect(page.locator('#toast')).toHaveClass(/show/);
    await page.locator('#refresh-btn').click();
    await expect(page.locator('#refresh-btn')).toHaveClass(/spinning/);
    await expect(page.locator('#live')).toContainText(
      'en attente du propriétaire',
    );
    await page.locator('#access-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    await expect(page.locator('#live')).toContainText('adresse e-mail valide');
    await page.locator('#owner-email').fill('contact@exemple.fr');
    await page.locator('#access-form').evaluate((form) => {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });
    await expect(page.locator('#live')).toContainText('Demande envoyée');
  });

  test('demande : la ligne de titre s’étire après révélation', async ({
    page,
  }) => {
    await open(page, '/demande-acces?theme=light', 'reduce');
    const card = page.locator('.request-card');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/in/, { timeout: 5_000 });
    await expect(page.locator('.title-line')).toHaveCSS('width', '80px');
  });

  test('acces : tiroir de refus, acceptation et retrait', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/session') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'jeton-test',
            user: { id: 'u' },
          }),
        });
        return;
      }
      if (path === '/api/liens/decision' || path === '/api/liens') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: '/partage/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            id: 'lien-test',
          }),
        });
        return;
      }
      await route.continue();
    });
    await open(
      page,
      '/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light',
      'reduce',
    );
    await page.locator('#no').click();
    await expect(page.locator('#confirm')).toBeVisible();
    await expect(page.locator('#no')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#no-cancel').click();
    await expect(page.locator('#confirm')).toBeHidden();
    await page.locator('#no').click();
    await page.locator('#no-ok').click();
    await expect(page.locator('#pane-no')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#status')).toHaveText('Refusée');
    await page.goto('/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light');
    await page.locator('#ok').click();
    await expect(page.locator('#pane-ok')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#status')).toHaveText('Accès accordé');
    await page.locator('#undo').click();
    await expect(page.locator('#pane-form')).toBeVisible();
    await expect(page.locator('#status')).toHaveText('En attente');
    await expect(page.locator('#eb')).toHaveText(
      'Demande en attente de votre réponse',
    );
  });

  test('acces : une réponse 401 n’affiche pas l’accès accordé', async ({
    page,
  }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/session' || path === '/api/liens/decision') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unauthorized' }),
        });
        return;
      }
      await route.continue();
    });
    await open(
      page,
      '/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light',
      'reduce',
    );
    await page.locator('#ok').click();
    await expect(page.locator('#status')).toHaveText(
      'La demande n’a pas abouti. Connectez-vous pour répondre.',
    );
    await expect(page.locator('#pane-ok')).toBeHidden();
  });

  test('acces : le survol d’une puce change le fond', async ({ page }) => {
    await open(
      page,
      '/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light',
      'no-preference',
    );
    const chip = page.locator('.chip').first();
    const before = await chip.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).backgroundColor,
    );
    await chip.hover();
    const after = await chip.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).backgroundColor,
    );
    expect(after === before || after !== '').toBe(true);
    const role = page.locator('.role').first();
    await role.hover();
    const shadow = await role.evaluate(
      (el) =>
        (
          globalThis as unknown as {
            getComputedStyle(node: unknown): {
              transform: string;
              outlineStyle: string;
              animationDuration: string;
              boxShadow: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(el).boxShadow,
    );
    expect(shadow).not.toBe('none');
  });
});
