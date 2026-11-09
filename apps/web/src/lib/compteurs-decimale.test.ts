import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('compteurs des pages méthode et pro', () => {
  it('respectent la langue pour le séparateur décimal', () => {
    for (const file of ['methode.astro', 'pro.astro'] as const) {
      const src = readFileSync(
        new URL(`../pages/${file}`, import.meta.url),
        'utf8',
      );
      expect(src, file).toContain("document.documentElement.lang!=='en'");
      expect(src, file).not.toMatch(
        /textContent=\(to\*e\)\.toFixed\(dec\)\.replace\('\.',','\)/,
      );
    }
  });
});
