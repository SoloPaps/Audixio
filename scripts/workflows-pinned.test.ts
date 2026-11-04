import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = '.github/workflows';
const workflows = readdirSync(dir)
  .filter((f) => /\.ya?ml$/.test(f))
  .map((f) => ({ file: f, text: readFileSync(path.join(dir, f), 'utf8') }));

describe('workflows figés (code scanning : zizmor, Scorecard)', () => {
  it('épingle chaque action sur un SHA complet', () => {
    const loose = workflows.flatMap(({ file, text }) =>
      [...text.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)]
        .map((m) => m[1] as string)
        .filter((ref) => !ref.startsWith('./') && !/@[0-9a-f]{40}$/.test(ref))
        .map((ref) => `${file}: ${ref}`),
    );
    expect(loose).toEqual([]);
  });

  it('épingle chaque image de conteneur par empreinte', () => {
    const loose = workflows.flatMap(({ file, text }) =>
      [...text.matchAll(/^\s*image:\s*(\S+)/gm)]
        .map((m) => m[1] as string)
        .filter((ref) => !/@sha256:[0-9a-f]{64}$/.test(ref))
        .map((ref) => `${file}: ${ref}`),
    );
    expect(loose).toEqual([]);
  });

  it('n’installe aucun paquet hors fichier de verrouillage', () => {
    const adhoc = workflows.flatMap(({ file, text }) =>
      text
        .split('\n')
        .filter((line) =>
          /\b(?:npm|pnpm|yarn)\s+(?:install|i|add)\s+(?:-g\s+)?[\w@]/.test(
            line,
          ),
        )
        .map((line) => `${file}: ${line.trim()}`),
    );
    expect(adhoc).toEqual([]);
  });

  it('fige la CLI Netlify par un package-lock', () => {
    const lock = JSON.parse(
      readFileSync('.github/netlify-cli/package-lock.json', 'utf8'),
    ) as { packages: Record<string, { version?: string; integrity?: string }> };
    expect(lock.packages['node_modules/netlify-cli']?.version).toBe('23.15.1');
    expect(lock.packages['node_modules/netlify-cli']?.integrity).toMatch(
      /^sha512-/,
    );
  });
});
