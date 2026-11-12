import { expect, type Page, test } from '@playwright/test';

// QA Mo 05/11 : droits du visiteur sans compte (matrice statut → droits).

const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';

function payload(): unknown {
  const domains = [
    ['performance', 58],
    ['seo', 78],
    ['securite', null],
    ['ecologie', 60],
    ['accessibilite', 81],
    ['qualite', 84],
    ['vie_privee', null],
    ['dns_email', null],
  ] as const;
  return {
    audit: {
      id: AUDIT_ID,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: null,
      siteVerified: false,
      partialLabel: 'partielle · 5 domaines · site non vérifié',
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000bb',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: domains.map(([domain, score]) => ({
      domain,
      score,
      coverage: 1,
      level: score === null ? 'untested' : 'improve',
      locked: score === null,
    })),
    findings: [
      {
        domain: 'seo',
        checkId: 'seo.title',
        status: 'fail',
        severity: 3,
        impact: 3,
        score: 0,
        measured: {},
        messageKey: 'check.seo.title',
        params: {},
        fixKey: 'seo.title',
        effortMinutes: 10,
        reason: null,
      },
    ],
  };
}

async function asGuest(page: Page): Promise<string[]> {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/liens')) calls.push(request.url());
  });
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 401, body: '{}' }),
  );
  await page.addInitScript(
    ([key, value]) => {
      const view = globalThis as unknown as {
        sessionStorage: { setItem: (name: string, data: string) => void };
      };
      view.sessionStorage.setItem(key, value);
    },
    ['audixio-guest-audit', JSON.stringify(payload())] as const,
  );
  return calls;
}

test('H1 : un visiteur ne peut pas créer de lien de partage public', async ({
  page,
}) => {
  const calls = await asGuest(page);
  await page.goto(`/rapport/${AUDIT_ID}`);
  await page.locator('#shareBtn').click();
  const dialog = page.getByRole('dialog', { name: 'Partager le rapport' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText('Créez un compte gratuit pour partager ce rapport'),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Créer le lien' }),
  ).toHaveCount(0);
  await expect(dialog.getByText('Lien actif')).toHaveCount(0);
  await expect(dialog.locator('#share-url')).toHaveCount(0);
  const next = encodeURIComponent(`/rapport/${AUDIT_ID}`);
  await expect(
    dialog.getByRole('link', { name: 'Créer un compte' }),
  ).toHaveAttribute('href', `/inscription?next=${next}`);
  await expect(dialog.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
    'href',
    `/connexion?next=${next}`,
  );
  const shares = await page.evaluate(() =>
    (
      globalThis as unknown as {
        localStorage: { getItem: (key: string) => string | null };
      }
    ).localStorage.getItem('audixio-local-shares'),
  );
  expect(shares).toBeNull();
  expect(calls).toEqual([]);
  await dialog
    .getByRole('button', { name: /Fermer/ })
    .first()
    .click();
  await page.locator('#shareBtn').click();
  await expect(dialog.getByText('Lien actif')).toHaveCount(0);
  await expect(
    dialog.getByRole('link', { name: 'Créer un compte' }),
  ).toBeVisible();
});

test('H2 : /plan sans compte affiche le mur de connexion, pas le plan', async ({
  page,
}) => {
  await asGuest(page);
  await page.goto(`/rapport/${AUDIT_ID}/plan`);
  const card = page.locator('.session-wall');
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(
    'Connectez-vous ou inscrivez-vous',
  );
  const next = encodeURIComponent(`/rapport/${AUDIT_ID}/plan`);
  await expect(card.getByRole('link', { name: 'Connexion' })).toHaveAttribute(
    'href',
    `/connexion?next=${next}`,
  );
  await expect(page.getByText('Gains rapides')).toHaveCount(0);
  await expect(page.getByText('Titre de page')).toHaveCount(0);
  await page.goto('/rapport/plan');
  await expect(page.locator('.session-wall h1')).toHaveText(
    'Connectez-vous ou inscrivez-vous',
  );
});
