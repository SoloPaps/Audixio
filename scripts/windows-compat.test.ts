import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { commande } from './commande.mjs';
import { supabaseTests } from './tests-supabase.mjs';

// Sous Windows, `new URL(import.meta.url).pathname` donne « /C:/… » : joint
// à un chemin, il devient « C:\C:\… » (ENOENT). Les fichiers de code passent
// par fileURLToPath. Ce fichier, qui décrit le motif, est hors du balayage.
const META = ['import', 'meta', 'url'].join('\\.');
const PATHNAME_OF_MODULE = new RegExp(`${META},?\\s*\\)\\s*\\.pathname`, 'u');

function trackedCode(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => /\.(?:[cm]?[jt]s|astro|svelte)$/u.test(file))
    .filter((file) => !file.startsWith('packages/engine/data/'))
    .filter((file) => file !== 'scripts/windows-compat.test.ts');
}

describe('compatibilité Windows', () => {
  it('aucun chemin de fichier tiré du pathname de l’URL du module', () => {
    const offenders = trackedCode().filter((file) =>
      PATHNAME_OF_MODULE.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('les fichiers comparés octet pour octet sortent en LF partout', () => {
    const files = [
      'supabase/templates/confirmation.html',
      'supabase/templates/confirmation.txt',
      'apps/web/public/dictionnaire-en.json',
      'scripts/windows-compat.test.ts',
    ];
    const out = execFileSync(
      'git',
      ['check-attr', 'text', 'eol', '--', ...files],
      {
        encoding: 'utf8',
      },
    );
    for (const file of files) {
      expect(out).toContain(`${file}: eol: lf`);
      expect(out).not.toContain(`${file}: text: unset`);
    }
  });

  it('pnpm, npx et tsx passent par le shell sous Windows, arguments cités', () => {
    expect(
      commande('pnpm', ['exec', 'tsx', 'scripts/e2e-ui-lab.ts'], 'linux'),
    ).toEqual({
      cmd: 'pnpm',
      args: ['exec', 'tsx', 'scripts/e2e-ui-lab.ts'],
      shell: false,
    });
    expect(
      commande('pnpm', ['exec', 'tsx', 'scripts/e2e-ui-lab.ts'], 'win32'),
    ).toEqual({
      cmd: 'pnpm exec tsx scripts/e2e-ui-lab.ts',
      args: [],
      shell: true,
    });
    expect(
      commande(
        'pnpm',
        ['-e', "console.log('a b')", 'C:\\Mes Projets\\x'],
        'win32',
      ).cmd,
    ).toBe('pnpm -e "console.log(\'a b\')" "C:\\Mes Projets\\x"');
  });

  it('aucun spawn direct de pnpm, npx, npm ou tsx (ENOENT sous Windows)', () => {
    const direct =
      /\b(?:spawn|spawnSync|execFile|execFileSync)\(\s*['"`](?:pnpm|npx|npm|tsx)['"`]/u;
    const offenders = trackedCode().filter((file) =>
      direct.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('AUDIGY_SANS_SUPABASE écarte seulement les tests de base locale', () => {
    const skipped = supabaseTests(process.cwd());
    expect(skipped).toContain(
      'packages/orchestrator/test/schedule-alerts.e2e.test.ts',
    );
    expect(skipped).toContain('packages/db/test/rls.test.ts');
    expect(skipped).not.toContain('packages/db/test/local-absent.test.ts');
    expect(skipped.every((file) => !file.includes('\\'))).toBe(true);
  });
});
