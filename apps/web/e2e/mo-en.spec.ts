import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

// QA Mo 05/11 : plus de français quand l’anglais est actif.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('M14 : /bienvenue EN, visiteur : titre « Welcome »', async ({ page }) => {
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main h1')).toHaveText('Welcome');
  await expect(page.locator('main')).not.toContainText('Bienvenue');
});

test('M14 : /bienvenue EN, connecté : fil, titre et étapes en anglais', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  const main = page.locator('main');
  await expect(main.locator('h1')).toContainText('Welcome to Audixio');
  await expect(main.locator('.crumbs')).toContainText('Home');
  await expect(main.locator('.crumbs')).toContainText('Welcome');
  await expect(main.locator('.bv-trk')).toContainText('1. Audit');
  await expect(main.locator('.bv-trk')).toContainText('3. Track');
  await expect(main).toContainText('Run my first audit');
  for (const french of [
    'Bienvenue',
    'Auditer',
    'Suivre',
    'Accueil',
    'Lancer',
    'Voir mes sites',
    'Marquer comme faite',
  ]) {
    await expect(main).not.toContainText(french);
  }
});

test('M15 : /courriel (404) EN se traduit sans attendre un dictionnaire lent', async ({
  page,
}) => {
  await page.goto('/courriel?theme=light');
  await expect(page.locator('main h1')).toContainText('évaporée');
  const link = page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' });
  await link.waitFor();
  await page.waitForLoadState('networkidle');
  // Après le choix EN, la page rechargée ne doit plus attendre le réseau (tunnel lent de Mo).
  let slow = false;
  await page.route(
    (url) => url.pathname === '/dictionnaire-fr.json',
    async (route) => {
      if (slow) await new Promise((done) => setTimeout(done, 8000));
      await route.continue().catch(() => undefined);
    },
  );
  const reloaded = page.waitForEvent('framenavigated');
  page.on('framenavigated', () => {
    slow = true;
  });
  await link.click();
  await reloaded;
  const main = page.locator('main');
  await expect(main.locator('h1')).toContainText('evaporated', {
    timeout: 4000,
  });
  await expect(main).toContainText('Quick access', { timeout: 1000 });
  await expect(page.locator('footer')).toContainText('Legal notice', {
    timeout: 1000,
  });
  await expect(main).not.toContainText('Accès rapide');
  await expect(page.locator('footer')).not.toContainText('Mentions légales');
  // Textes posés par le script de la page : taille du fichier et courriel prérempli.
  await expect(page.locator('#fsize')).toHaveText(/ KB$|bytes$/);
  await expect(page.locator('#mailLink')).toHaveAttribute(
    'href',
    /subject=Broken%20link.*reporting%20a%20broken%20link/,
  );
});

test('M16 : /progression EN, messages d’activité et délai en anglais', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Note chaque texte d’activité et de délai affiché (script en chaîne : pas de DOM côté Node).
  await page.addInitScript(`
    window.seen = [];
    document.addEventListener('DOMContentLoaded', () => {
      const note = () => {
        for (const id of ['task', 'timeLeft']) {
          const text = document.getElementById(id)?.textContent?.trim();
          if (text && !window.seen.includes(text)) window.seen.push(text);
        }
      };
      new MutationObserver(note).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    });
  `);
  await page.goto('/progression?maquette=1&theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('body')).toHaveClass(/\bdone\b/, {
    timeout: 60_000,
  });
  const seen = await page.evaluate<string[]>('window.seen');
  expect(seen).toContain(
    'Checking smoothness and reading comfort on smartphones',
  );
  expect(seen).toContain('Checking contrast and keyboard navigation');
  expect(seen).toContain('Reading the source code and looking for errors');
  expect(seen.some((text) => /^~\d+ seconds?$/.test(text))).toBe(true);
  const french = seen.filter((text) =>
    /Vérification|Contrôle|Lecture|Génération|Analyse|seconde/.test(text),
  );
  expect(french).toEqual([]);
});

test('M17 : le choix EN survit à une navigation pendant le téléchargement', async ({
  page,
}) => {
  await page.goto('/?theme=light');
  const link = page
    .locator('.axn-tools')
    .getByRole('link', { name: 'EN — English' });
  await link.waitFor();
  await page.waitForLoadState('networkidle');
  // Dictionnaire lent (tunnel de Mo) : on quitte l’accueil avant sa fin.
  let first = true;
  await page.route(
    (url) => url.pathname === '/dictionnaire-en.json',
    async (route) => {
      if (first) {
        first = false;
        await new Promise((done) => setTimeout(done, 5000));
      }
      await route.continue().catch(() => undefined);
    },
  );
  await link.click();
  await page.goto('/inscription?envoye=1&theme=light');
  const card = page.locator('main');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', {
    timeout: 15_000,
  });
  await expect(card).toContainText('Confirm your address');
  await expect(card).toContainText('I confirmed, sign me in');
  await expect(card).toContainText('Create an account');
  for (const french of [
    'Confirmez votre adresse',
    'J’ai confirmé',
    'Créer un compte',
  ]) {
    await expect(card).not.toContainText(french);
  }
});

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';

async function lockedReport(
  page: Page,
  partial: string,
  findings: unknown[] = [],
): Promise<void> {
  const body = {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: null,
      siteVerified: false,
      partialLabel: partial,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      { domain: 'accessibilite', score: 80, coverage: 1, level: 'good' },
      ...['seo', 'ecoconception', 'rgpd', 'qualite', 'mobile', 'securite'].map(
        (domain) => ({
          domain,
          score: null,
          coverage: 0,
          level: 'locked',
          locked: true,
        }),
      ),
    ],
    findings,
  };
  await stubSession(page);
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

test('B-1 : /rapport EN, pastille « partial · 2 domains · site not verified »', async ({
  page,
}) => {
  await lockedReport(page, 'partielle · 2 domaines · site non vérifié');
  await page.goto(`/rapport/${AUDIT_ID}?theme=light`);
  const pill = page.locator('.verified.partial');
  await expect(pill).toHaveText('partielle · 2 domaines · site non vérifié');
  await toEnglish(page);
  await expect(pill).toHaveText('partial · 2 domains · site not verified');
});

test('B-1 : un seul domaine ouvert, pastille au singulier', async ({
  page,
}) => {
  await lockedReport(page, 'partielle · 1 domaines · site non vérifié');
  await page.goto(`/rapport/${AUDIT_ID}?theme=light`);
  const pill = page.locator('.verified.partial');
  await expect(pill).toHaveText('partielle · 1 domaine · site non vérifié');
  await toEnglish(page);
  await expect(pill).toHaveText('partial · 1 domain · site not verified');
});

test('B-2 : /compte EN, carte Webflow sans « Gestion of »', async ({
  page,
}) => {
  await stubSession(page);
  await page.goto('/compte?theme=light');
  await toEnglish(page);
  const main = page.locator('main');
  await expect(main).toContainText('Asset & embed code management');
  await expect(main).not.toContainText('Gestion');
});

const ONE_FINDING = [
  {
    domain: 'performance',
    checkId: 'performance.poids',
    status: 'fail',
    severity: 4,
    impact: 3,
    score: 0,
    measured: {},
    messageKey: 'performance.poids.fail',
    params: {},
    fixKey: null,
    effortMinutes: 20,
    reason: null,
  },
];

test('B-3 : /domaine avec un seul constat, accords au singulier (FR puis EN)', async ({
  page,
}) => {
  await lockedReport(
    page,
    'partielle · 2 domaines · site non vérifié',
    ONE_FINDING,
  );
  await page.goto(`/rapport/${AUDIT_ID}/domaines/performance?theme=light`);
  const main = page.locator('main');
  await expect(main.locator('a[href="#constats"]')).toHaveText(
    'Voir le constat',
  );
  await expect(main.locator('.sh2 .eyebrow')).toHaveText(
    'Diagnostics détaillés · 1 élément passé au crible',
  );
  await toEnglish(page);
  await expect(main.locator('a[href="#constats"]')).toHaveText(
    'See the finding',
  );
  await expect(main.locator('.sh2 .eyebrow')).toHaveText(
    'Detailed diagnostics · 1 item reviewed',
  );
  await expect(main).not.toContainText('the 1 findings');
  await expect(main).not.toContainText('1 items');
});

test('B-8 : /methode EN parle de GDPR, pas de RGPD', async ({ page }) => {
  await page.goto('/methode?theme=light');
  await toEnglish(page);
  const main = page.locator('main');
  await expect(main).toContainText('GDPR: consent before tracking');
  await expect(main).not.toContainText('RGPD');
});
