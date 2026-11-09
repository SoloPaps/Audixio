import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { stubSession, toEnglish } from './en-session.js';

/**
 * Flash de navigation (option a, décision owner) : avant la lecture de
 * l’audit, les pages du rapport montrent un état neutre « Chargement du
 * rapport… », jamais « Analyse en cours. » ni le lien « Revenir à l’accueil ».
 */

const AUDIT_ID = '00000000-0000-4000-8000-0000000000f1';

function auditBody(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 74,
      siteVerified: true,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-0000000000f2',
        url: 'https://atelier-martin.fr',
        label: 'atelier-martin.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 58, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 88, coverage: 1, level: 'good' },
    ],
    findings: [],
  };
}

/** Session connectée ; la lecture de l’audit attend que le test la libère. */
async function holdAudit(page: Page): Promise<() => void> {
  await stubSession(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/audits/**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
  return release;
}

test('HTML servi : état neutre de chargement, sans « Analyse en cours »', async ({
  request,
}) => {
  for (const path of ['/rapport', '/domaine', '/constat', '/plan', '/brief']) {
    const html = await (await request.get(`${path}?id=${AUDIT_ID}`)).text();
    expect(html, path).toContain('Chargement du rapport…');
    expect(html, path).toContain('aria-busy="true"');
    expect(html, path).not.toContain('Analyse en cours');
    expect(html, path).not.toContain('Revenir à l’accueil');
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`rapport connecté : chargement neutre puis rapport (${theme})`, async ({
    page,
  }) => {
    const release = await holdAudit(page);
    await page.goto(`/rapport?id=${AUDIT_ID}&theme=${theme}`);
    const status = page.getByRole('status').filter({
      hasText: 'Chargement du rapport…',
    });
    await expect(status).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.getByText('Analyse en cours')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Revenir à l’accueil' }),
    ).toHaveCount(0);
    // Lisible dans les deux thèmes (contraste du texte de chargement).
    const axe = await new AxeBuilder({ page })
      .include('[aria-busy="true"]')
      .withRules(['color-contrast'])
      .analyze();
    expect(axe.violations).toEqual([]);
    release();
    await expect(
      page.getByRole('heading', { level: 1, name: /atelier-martin\.fr/ }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  });
}

test('rapport connecté en anglais : « Loading report… »', async ({ page }) => {
  await stubSession(page);
  await page.route('**/api/audits/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    }),
  );
  await page.goto('/bienvenue?theme=light');
  await toEnglish(page);
  const release = await holdAudit(page);
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=light`);
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading report…' }),
  ).toBeVisible();
  await expect(page.getByText('Chargement du rapport')).toHaveCount(0);
  release();
});
