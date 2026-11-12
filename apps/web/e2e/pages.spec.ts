import { test } from '@playwright/test';
import {
  contrast,
  darkBackground,
  noFrenchInEnglish,
  noOverflow390,
  stubSignedIn,
} from './page-checks.js';

/**
 * Un test par page : contraste clair et sombre, fond sombre, anglais sans
 * français, aucun débordement à 390 px. Les liens morts sont dans liens.spec.
 */
type Row = { path: string; contrast?: true; dark?: true; english?: true };

const PAGES: Row[] = [
  { path: '/', contrast: true, dark: true, english: true },
  { path: '/methode', contrast: true, dark: true, english: true },
  { path: '/sites', contrast: true, dark: true },
  { path: '/exemple-rapport', contrast: true, dark: true, english: true },
  { path: '/rapport', contrast: true, dark: true },
  { path: '/demande-acces', contrast: true, dark: true },
  { path: '/pro', contrast: true, dark: true, english: true },
  { path: '/confidentialite', contrast: true, dark: true, english: true },
  { path: '/cgu', contrast: true, dark: true, english: true },
  { path: '/ecoconception', contrast: true, dark: true, english: true },
  { path: '/connexion', contrast: true, dark: true },
  { path: '/inscription', contrast: true, dark: true },
  { path: '/mentions-legales', contrast: true, dark: true, english: true },
  { path: '/accessibilite', contrast: true, dark: true, english: true },
  { path: '/cookies', contrast: true, dark: true },
  { path: '/robot', contrast: true, dark: true, english: true },
  { path: '/audit-echoue', contrast: true, dark: true, english: true },
  { path: '/progression', contrast: true, dark: true, english: true },
  { path: '/compte', contrast: true, dark: true },
  { path: '/bienvenue', contrast: true, dark: true, english: true },
  { path: '/verifier', contrast: true, dark: true },
  { path: '/badge', dark: true },
  { path: '/brief', dark: true },
  { path: '/compte/alertes', dark: true },
  { path: '/constat', dark: true },
  { path: '/domaine', dark: true },
  { path: '/email-confirme', dark: true, english: true },
  { path: '/historique', dark: true },
  { path: '/maintenance', dark: true },
  { path: '/partage', dark: true, english: true },
  { path: '/passer-pro', dark: true, english: true },
  { path: '/plan', dark: true },
  { path: '/rapport/imprimer', dark: true },
  { path: '/reinitialisation', dark: true, english: true },
  { path: '/score', dark: true, english: true },
  { path: '/404', dark: true },
  { path: '/500', dark: true },
  { path: '/score/exemple-score', dark: true },
  { path: `/partage/${'ab'.repeat(16)}`, dark: true },
  { path: '/verifier/00000000-0000-4000-8000-000000000019', dark: true },
];

for (const row of PAGES) {
  test(`page ${row.path}`, async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const fresh = async () => (await browser.newContext({ baseURL })).newPage();
    if (row.contrast) {
      for (const theme of ['light', 'dark'] as const) {
        await test.step(`contraste ${theme}`, async () => {
          const page = await fresh();
          await contrast(page, row.path, theme);
          await page.context().close();
        });
      }
    }
    if (row.dark) {
      await test.step('fond sombre', async () => {
        const page = await fresh();
        await stubSignedIn(page);
        await darkBackground(page, row.path);
        await page.context().close();
      });
    }
    if (row.english) {
      await test.step('anglais', async () => {
        const page = await fresh();
        await noFrenchInEnglish(page, row.path);
        await page.context().close();
      });
    }
    await test.step('390 px', async () => {
      const page = await fresh();
      await noOverflow390(page, row.path);
      await page.context().close();
    });
  });
}
