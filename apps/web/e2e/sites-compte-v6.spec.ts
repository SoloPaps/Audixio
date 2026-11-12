import { expect, test } from '@playwright/test';
import { toEnglish } from './en-session.js';
import { escapeRe } from './origin.js';
import { AUDITS, SITE_HOST, SITE_ID, stubSiteAccount } from './site-session.js';

/**
 * Lot 4 (STRUCTURE.md §4, §5, §7, §8) : page d’un site `/sites/:host` en
 * quatre sections, résolveur `/sites/id/:site`, `/compte` en sections,
 * redirections R11, R12 et R15. Compte simulé, jamais un vrai compte.
 */

test.describe('redirections R11, R12, R15', () => {
  const CASES = [
    [`/historique?site=${SITE_ID}`, `/sites/id/${SITE_ID}#historique`],
    [`/verifier?site=${SITE_ID}`, `/sites/id/${SITE_ID}#verification`],
    ['/compte/alertes', '/compte#alertes'],
    [`/compte/alertes?site=${SITE_ID}`, `/compte?site=${SITE_ID}#alertes`],
  ] as const;
  for (const [from, to] of CASES) {
    test(`${from} → 301 ${to}`, async ({ page }) => {
      const response = await page.request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(to);
    });
  }
});

test('résolveur : /sites/id/:site remplace l’adresse par /sites/:host et garde l’ancre', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.goto(`/sites/id/${SITE_ID}#verification`);
  await expect(page).toHaveURL(
    new RegExp(`/sites/${escapeRe(SITE_HOST)}#verification$`, 'u'),
  );
  await expect(page.locator('h1')).toHaveText(SITE_HOST);
});

test('résolveur : un site absent du compte renvoie vers /sites', async ({
  page,
}) => {
  await stubSiteAccount(page, { sites: false });
  await page.goto(`/sites/id/${SITE_ID}#historique`);
  await expect(page).toHaveURL(/\/sites$/u);
});

test('page d’un site : quatre sections, audits du plus récent au plus ancien', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.goto(`/sites/${SITE_HOST}?theme=light`);
  await expect(page.locator('html')).toHaveAttribute('data-page', 'site');
  await expect(page.locator('main#contenu')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText(SITE_HOST);
  for (const id of ['audits', 'historique', 'verification', 'partage']) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
    await expect(page.locator(`.st-tabs a[href="#${id}"]`)).toHaveCount(1);
  }
  const rows = page.locator('#audits .st-row');
  await expect(rows).toHaveCount(3);
  const newest = AUDITS[2][0];
  await expect(rows.first().locator('a')).toHaveAttribute(
    'href',
    `/rapport/${newest}`,
  );
  await expect(rows.first().locator('time')).toHaveAttribute(
    'datetime',
    AUDITS[2][1],
  );
  // Sections intégrées : titres de niveau 2, pas de second <main> ni fil d’Ariane.
  await expect(page.locator('#historique h2#t')).toBeVisible();
  await expect(page.locator('#historique .crumbs')).toHaveCount(0);
  await expect(page.locator('#verification h2#h1')).toContainText(SITE_HOST);
  await expect(page.locator('#verification .crumbs')).toHaveCount(0);
  await expect(page.locator('#partage fieldset')).toBeVisible();
  await expect(page.locator('a[href^="/progression?site="]')).toHaveAttribute(
    'href',
    new RegExp(`site=${SITE_ID}`, 'u'),
  );
});

test('page d’un site : l’ancre #historique est rejouée après le chargement', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.goto(`/sites/${SITE_HOST}?theme=light#historique`);
  await expect(page.locator('#historique h2#t')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('#historique')
        .evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(200);
});

test('page d’un site : un hôte absent du compte ne révèle rien', async ({
  page,
}) => {
  await stubSiteAccount(page, { sites: false });
  await page.goto('/sites/inconnu.exemple?theme=light');
  await expect(page.locator('h1')).toHaveText(
    'Ce site n’est pas dans votre compte.',
  );
  await expect(page.locator('#audits')).toHaveCount(0);
});

test('page d’un site : clavier, sommaire puis section', async ({ page }) => {
  await stubSiteAccount(page);
  await page.goto(`/sites/${SITE_HOST}?theme=light`);
  const tab = page.locator('.st-tabs a[href="#partage"]');
  await tab.focus();
  await expect(tab).toBeFocused();
  const outline = await tab.evaluate(
    (node) =>
      (
        globalThis as unknown as {
          getComputedStyle: (el: unknown) => { outlineStyle: string };
        }
      ).getComputedStyle(node).outlineStyle,
  );
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#partage$/u);
});

for (const theme of ['light', 'dark'] as const) {
  test(`page d’un site à 390 px, ${theme} : rien ne déborde`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubSiteAccount(page);
    await page.goto(`/sites/${SITE_HOST}?theme=${theme}`);
    await expect(page.locator('#partage fieldset')).toBeVisible();
    const width = await page.locator('html').evaluate((el) => el.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
}

test('page d’un site en anglais : sections traduites, hôte intact', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.goto(`/sites/${SITE_HOST}?theme=light`);
  await toEnglish(page);
  await expect(page.locator('#st-audits')).toHaveText('Site audits');
  await expect(page.locator('h1')).toHaveText(SITE_HOST);
});

test('/compte : trois sections et leur sommaire, une seule page', async ({
  page,
}) => {
  await stubSiteAccount(page);
  await page.goto('/compte?theme=light#alertes');
  await expect(page.locator('html')).toHaveAttribute('data-page', 'compte');
  await expect(page.locator('main#contenu')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  for (const id of ['profil', 'alertes', 'abonnement']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator(`.ct-tabs a[href="#${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator('#alertes h2#t')).toBeVisible();
  await expect(page.locator('#alertes .crumbs')).toHaveCount(0);
  await expect(page.locator('#toast')).toHaveCount(1);
  await expect(page.locator('#live')).toHaveCount(1);
  await expect(page.locator('a[href="/compte/alertes"]')).toHaveCount(0);
});
