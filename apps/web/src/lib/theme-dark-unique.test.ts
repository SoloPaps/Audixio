import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Garde-fou du thème sombre (docs/design/theme-sombre-decisions.md) :
 * styles/theme-dark.css est le seul endroit où une couleur sombre est définie.
 */
const WEB = fileURLToPath(new URL('../..', import.meta.url));
const SINGLE = join(WEB, 'src/styles/theme-dark.css');
const SCANNED = /\.(css|svelte|astro|ts|js|mjs)$/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' ? [] : walk(path);
    return SCANNED.test(entry.name) && !entry.name.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

const files = [...walk(join(WEB, 'src')), ...walk(join(WEB, 'public'))];
const others = files.filter((file) => file !== SINGLE);
const read = (file: string): string =>
  readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const single = read(SINGLE);
const palette = new Set(
  [...single.matchAll(/--d-([a-z0-9]+)\s*:/g)].map((m) => m[1]),
);

function offenders(pattern: RegExp, list = others): string[] {
  return list
    .filter((file) => pattern.test(read(file)))
    .map((file) => relative(WEB, file));
}

describe('thème sombre : un seul fichier', () => {
  it('trouve le fichier unique et sa palette de rôles', () => {
    expect(files).toContain(SINGLE);
    for (const role of [
      'bg',
      'sf',
      'ln',
      'tx',
      'mu',
      'ac',
      'cta',
      'ok',
      'er',
      'wa',
    ]) {
      expect(palette.has(role), `--d-${role}`).toBe(true);
    }
  });

  it('aucun sélecteur de thème sombre hors du fichier unique', () => {
    expect(offenders(/\[\s*data-theme\s*=\s*["']?dark["']?\s*\]/)).toEqual([]);
    expect(
      offenders(/:not\(\s*\[\s*data-theme\s*=\s*["']?light["']?\s*\]\s*\)/),
    ).toEqual([]);
  });

  it('aucune media query prefers-color-scheme: dark hors du fichier unique', () => {
    expect(offenders(/@media[^{]*prefers-color-scheme\s*:\s*dark/)).toEqual([]);
  });

  it('les rôles --d-* ne sont définis que dans le fichier unique', () => {
    expect(offenders(/(^|[\s;{'"`])--d-[a-z0-9]+\s*:/m)).toEqual([]);
  });

  it('chaque rôle utilisé existe dans la palette', () => {
    const unknown = new Set<string>();
    const uses = [
      /var\(\s*--d-([a-z0-9]+)/g,
      /\b(?:roleColor|RC|D|d)\(\s*['"]([a-z0-9]+)['"]\s*,/g,
    ];
    for (const file of files) {
      const text = read(file);
      for (const use of uses) {
        for (const match of text.matchAll(use)) {
          if (!palette.has(match[1] ?? '')) {
            unknown.add(`${relative(WEB, file)} : --d-${match[1]}`);
          }
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it('le fichier unique n’agit qu’en thème sombre', () => {
    const selectors = [
      ...single.matchAll(/(?:^|[;{}])\s*([^;{}@]+?)\s*\{/g),
    ].map((m) => m[1] ?? '');
    expect(selectors.length).toBeGreaterThan(0);
    for (const list of selectors) {
      for (const selector of list.split(/,(?![^()]*\))/)) {
        expect(selector.trim(), selector).toMatch(/^html\[data-theme="dark"\]/);
      }
    }
  });

  it('les anciennes surcharges sombres par page ont disparu', () => {
    const legacy = files.filter((file) => /theme-dark-[a-z]+\.css$/.test(file));
    expect(legacy.map((file) => relative(WEB, file))).toEqual([]);
  });
});
