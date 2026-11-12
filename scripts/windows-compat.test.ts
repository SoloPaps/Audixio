import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
});
