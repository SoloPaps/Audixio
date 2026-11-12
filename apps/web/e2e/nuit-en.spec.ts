import { expect, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

type ProbeNode = {
  id: string;
  textContent: string | null;
  firstChild: ProbeNode | null;
};
type ProbeDoc = {
  createElement: (tag: string) => ProbeNode;
  querySelector: (
    selector: string,
  ) => (ProbeNode & { append: (node: ProbeNode) => void }) | null;
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('/compte EN : « Coming soon » sans pluriel fautif', async ({ page }) => {
  await stubSession(page);
  await page.goto('/compte?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toContainText('Coming soon');
  await expect(page.locator('main')).not.toContainText('Coming soons');
});

test('/compte/alertes EN : titre entièrement anglais', async ({ page }) => {
  await stubSession(page);
  await page.goto('/compte/alertes?theme=light');
  await toEnglish(page);
  await expect(page.locator('h1')).toHaveText('Settings for alerts');
});

test('/accessibilite EN : Défenseur des droits et Libre réponse sont traduits', async ({
  page,
}) => {
  await page.goto('/accessibilite?theme=light');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toContainText(
    'Defender of Rights (Défenseur des droits)',
  );
  await expect(page.locator('main')).toContainText(
    'Freepost (Libre réponse 71120)',
  );
  await expect(page.locator('address')).toContainText('75342 Paris CEDEX 07');
  await expect(page.locator('main')).not.toContainText(
    'Le Défenseur des droits',
  );
  await expect(page.locator('main')).not.toContainText(
    'French Rights Defender',
  );
  await expect(page.locator('main')).not.toContainText(
    'The Défenseur des droits',
  );
});

test('/mentions-legales EN : Observatoire Numérique est traduit', async ({
  page,
}) => {
  await page.goto('/mentions-legales?theme=light');
  await toEnglish(page);
  await expect(page.locator('main')).toContainText(
    'Audixio Digital Observatory',
  );
  await expect(page.locator('main')).not.toContainText(
    'Audixio Observatoire Numérique',
  );
});

test('/confidentialite EN : Observatoire Numérique est traduit', async ({
  page,
}) => {
  await page.goto('/confidentialite?theme=light');
  await toEnglish(page);
  await expect(page.locator('main')).toContainText(
    'Audixio Digital Observatory',
  );
  await expect(page.locator('main')).not.toContainText(
    'Audixio Observatoire Numérique',
  );
});

test('/mentions-legales EN : « browser » n’est pas répété autour de localStorage', async ({
  page,
}) => {
  await page.goto('/mentions-legales?theme=light');
  await toEnglish(page);
  await expect(page.locator('main')).toContainText(
    'stored only in the localStorage of your browser.',
  );
  await expect(page.locator('main')).not.toContainText('browser’s');
});

test('/mentions-legales EN : le toast de copie est en anglais', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/mentions-legales?theme=light');
  await toEnglish(page);
  await page.locator('button.copy').first().click();
  await expect(
    page.getByText('Address copied: Audixio@outlook.fr').first(),
  ).toBeAttached();
  await expect(page.getByText('Adresse copiée')).toHaveCount(0);
});

test('/progression EN : les compteurs sont en anglais', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/progression?maquette=1&theme=light');
  await toEnglish(page);
  const counts = page.locator('#counts');
  await expect(counts).toContainText('in progress');
  await expect(counts).toContainText('domains');
  await expect(counts).not.toContainText(
    /en cours|terminé|en attente|domaines/,
  );
});

test('/ EN : la mention d’exemple suit l’ordre anglais', async ({ page }) => {
  await page.goto('/?theme=light');
  await toEnglish(page);
  await expect(page.locator('#suite .sim-note')).toHaveText(
    'Sample visuals, simulated data.',
  );
});

test('/ EN : le scan animé du héros est en anglais', async ({ page }) => {
  await page.goto('/?theme=light');
  await toEnglish(page);
  await page.reload();
  const status = page.locator('#top [data-scanst]');
  await expect(status).toHaveText('Scan complete', { timeout: 15_000 });
  await expect(status).not.toContainText('Analyse');
  await expect(page.locator('#top .journal')).not.toContainText(/[éèàç]/);
});

// Clic sur « EN » avant l’hydratation : le navigateur suit le lien ?lang=en.
for (const path of ['/', '/robot', '/maintenance', '/methode']) {
  test(`${path}?lang=en : la page passe réellement en anglais`, async ({
    page,
  }) => {
    await page.goto(`${path}?lang=en&theme=light`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1').first()).not.toHaveText(
      /Vérifiez|Robot Audixio|peaufine|Comment/,
    );
  });
}

test('/sites/…/demandes EN : changer de langue garde le rôle et la durée', async ({
  page,
}) => {
  await page.goto('/sites/exemple.fr/demandes/req_948f2a1b7e?theme=light');
  await page.locator('#acces-role-rapport').check({ force: true });
  await page.locator('#dur').selectOption('90');
  await toEnglish(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#acces-role-rapport')).toBeChecked();
  await expect(page.locator('#dur')).toHaveValue('90');
});

// Cause de « 6 audits » figé en EN sur /historique : un texte mis à jour par
// le code était repeint avec la traduction de l’ancien texte.
test('EN : un texte mis à jour par le code est retraduit, pas figé', async ({
  page,
}) => {
  await page.goto('/robot?theme=light');
  await toEnglish(page);
  await page.evaluate(() => {
    const doc = (globalThis as unknown as { document: ProbeDoc }).document;
    const p = doc.createElement('p');
    p.id = 'probe';
    p.textContent = 'Note globale pondérée (1 audit)';
    doc.querySelector('main')?.append(p);
  });
  const probe = page.locator('#probe');
  await expect(probe).toHaveText('Weighted overall grade (1 audit)');
  await page.evaluate(() => {
    const doc = (globalThis as unknown as { document: ProbeDoc }).document;
    const node = doc.querySelector('#probe')?.firstChild;
    if (node) node.textContent = 'Réglages des ';
  });
  await expect(probe).toHaveText('Settings for');
});
