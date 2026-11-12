import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  ALL_MODES,
  checkLinks,
  collectLinks,
  markButtons,
  type Mode,
  modeName,
  openMode,
  PAGES,
  probeButton,
  visit,
} from './robot/robot-lib.js';

// Robot de fin de lot. En CI : liens en FR clair 1440 et EN sombre 390, boutons
// en FR clair 1440. ROBOT_FULL=1 : les huit modes (FR/EN, clair/sombre, 390/1440)
// pour les liens, et les boutons à 390 comme à 1440.
const FULL = process.env.ROBOT_FULL === '1';
const LINK_MODES: Mode[] = FULL
  ? ALL_MODES
  : [
      { lang: 'fr', theme: 'light', width: 1440 },
      { lang: 'en', theme: 'dark', width: 390 },
    ];
const BUTTON_MODES: Mode[] = FULL
  ? [
      { lang: 'fr', theme: 'light', width: 1440 },
      { lang: 'fr', theme: 'light', width: 390 },
    ]
  : [{ lang: 'fr', theme: 'light', width: 1440 }];

const OUT = join(import.meta.dirname, '../test-results/robot');

test.describe.configure({ mode: 'parallel' });

for (const target of PAGES) {
  test(`robot : ${target.path}`, async ({ browser, request }) => {
    test.setTimeout(FULL ? 600_000 : 240_000);
    const problems: string[] = [];
    const actions: Record<string, string> = {};
    for (const mode of LINK_MODES) {
      const page = await openMode(browser, target, mode);
      await visit(page, target.path, mode.theme);
      const links = await collectLinks(page);
      for (const p of await checkLinks(page, request, links)) {
        problems.push(`[${modeName(mode)}] ${p}`);
      }
      await page.context().close();
    }
    for (const mode of BUTTON_MODES) {
      const page = await openMode(browser, target, mode);
      await visit(page, target.path, mode.theme);
      const buttons = await markButtons(page);
      for (const { n, label } of buttons) {
        let effect = await probeButton(page, n);
        if (effect === null) {
          // Un état laissé par le bouton précédent peut masquer celui-ci : page neuve, second essai.
          await visit(page, target.path, mode.theme);
          await markButtons(page);
          effect = await probeButton(page, n);
        }
        actions[`${modeName(mode)} #${n} ${label}`] = effect ?? 'AUCUNE';
        if (effect === null) {
          problems.push(
            `[${modeName(mode)}] bouton sans action « ${label} » (#${n})`,
          );
        }
        if (effect !== null && effect !== 'déjà retiré') {
          await visit(page, target.path, mode.theme);
          await markButtons(page);
        }
      }
      await page.context().close();
    }
    mkdirSync(OUT, { recursive: true });
    const slug =
      target.path.replace(/[^a-z0-9]+/giu, '_').replace(/^_|_$/gu, '') ||
      'accueil';
    writeFileSync(
      join(OUT, `${slug}.json`),
      JSON.stringify({ path: target.path, problems, actions }, null, 2),
    );
    expect(problems).toEqual([]);
  });
}
