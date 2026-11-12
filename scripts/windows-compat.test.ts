import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sous Windows, `new URL(import.meta.url).pathname` donne « /C:/… » : joint
// à un chemin, il devient « C:\C:\… » (ENOENT). Les fichiers de code passent
// par fileURLToPath. Motif construit en morceaux pour ne pas se trouver lui-même.
const META = ['import', 'meta', 'url'].join('\\.');
const PATHNAME_OF_MODULE = new RegExp(`${META},?\\s*\\)\\s*\\.pathname`, 'u');

function trackedCode(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => /\.(?:[cm]?[jt]s|astro|svelte)$/u.test(file))
    .filter((file) => !file.startsWith('packages/engine/data/'));
}

describe('compatibilité Windows', () => {
  it('aucun chemin de fichier tiré de URL(import.meta.url).pathname', () => {
    const offenders = trackedCode().filter((file) =>
      PATHNAME_OF_MODULE.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
