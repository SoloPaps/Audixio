import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { methodeEn } from '../i18n/methode-en.js';
import { methodeFr } from '../i18n/methode-fr.js';

describe('compteurs des pages méthode et pro', () => {
  it('respectent la langue pour le séparateur décimal', () => {
    const src = readFileSync(
      new URL('../pages/pro.astro', import.meta.url),
      'utf8',
    );
    expect(src).toContain("document.documentElement.lang!=='en'");
    expect(src).not.toMatch(
      /textContent=\(to\*e\)\.toFixed\(dec\)\.replace\('\.',','\)/,
    );
    // /methode v6 n’anime plus ses nombres : chaque décimale est traduite.
    for (const [key, line] of Object.entries(methodeFr)) {
      const en = methodeEn[key as keyof typeof methodeFr];
      if (!/\d,\d/.test(line)) continue;
      expect(en, key).toMatch(/\d\.\d/);
      expect(en, key).not.toMatch(/\d,\d/);
    }
  });
});
