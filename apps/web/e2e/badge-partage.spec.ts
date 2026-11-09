import { expect, type Page, test } from '@playwright/test';
import { stubSession } from './en-session.js';

// QA Mo 05/11, thème badge-partage : M3, B1, B2, B4.

const GUEST_ID = '1dfeaad0-f09c-4405-a5eb-eed8fe1235b1';

function guestPayload(): unknown {
  return {
    audit: {
      id: GUEST_ID,
      status: 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 74,
      siteVerified: false,
      coverage: 0.6,
      createdAt: '2026-11-05T10:00:00.000Z',
      startedAt: '2026-11-05T10:00:01.000Z',
      finishedAt: '2026-11-05T10:03:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://bon.audigy.test',
        label: 'bon.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 70, coverage: 1, level: 'improve' },
      { domain: 'seo', score: 80, coverage: 1, level: 'good' },
    ],
    findings: [],
  };
}

async function asGuest(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    sessionStorage.setItem('audixio-guest-audit', JSON.stringify(value));
  }, guestPayload());
}

test('M3 (bug_5db3cab6, bug_6de9c2d4) : badge visiteur sans lien public ni lien vers /rapport privé', async ({
  page,
}) => {
  await asGuest(page);
  await page.goto(`/badge?id=${GUEST_ID}&theme=light`);
  const code = page.locator('#code');
  await expect(code).toHaveValue(/<a href=/, { timeout: 15_000 });
  for (const style of [/^Complet/, /^Compact/, /^Pastille/]) {
    await page.getByRole('radio', { name: style }).check();
    const value = await code.inputValue();
    expect(value).not.toContain('/rapport');
    expect(value).not.toContain(GUEST_ID);
    expect(value).toContain('href="http://127.0.0.1:4321/"');
  }
  // Pas de champ « Lien public » vide ni de bouton « Copier le lien » inerte.
  await expect(page.locator('#lnk')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Copier le lien' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Voir la page publique' }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      'Créez un compte gratuit pour partager ce rapport par lien.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Créer un compte' }),
  ).toHaveAttribute('href', /\/inscription/);
  await expect(page.locator('.foot p')).toHaveText(
    'Sans compte, le badge renvoie vers l’accueil d’Audixio : votre rapport reste privé.',
  );
});

test('B1 (bug_ce249d1e) : un compte Pro ne lit pas le plafond du compte gratuit', async ({
  page,
}) => {
  await stubSession(page, 'pro');
  await page.goto('/compte?theme=light#acces-partages');
  const note = page.locator('#acces-partages .ap-note');
  await expect(note).toHaveText(
    'Compte Pro : liens actifs sans limite (public ou équipe). Le lien équipe reste en lecture seule, même sans compte pour le destinataire.',
    { timeout: 15_000 },
  );
  await expect(note).not.toContainText('Compte gratuit');
});

test('B1 : le compte gratuit garde son plafond d’un lien', async ({ page }) => {
  await stubSession(page, 'free');
  await page.goto('/compte?theme=light#acces-partages');
  await expect(page.locator('#acces-partages .ap-note')).toHaveText(
    'Compte gratuit : 1 lien actif à la fois (public ou équipe). Le lien équipe reste en lecture seule, même sans compte pour le destinataire.',
    { timeout: 15_000 },
  );
});
