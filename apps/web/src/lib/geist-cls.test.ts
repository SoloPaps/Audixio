import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * CLS de l’accueil en CI (0,43 à 1440 px) : sur le runner, la police de
 * repli de Geist était DejaVu Sans, bien plus large ; au remplacement, le
 * titre perdait une ligne et le héros remontait. Geist est préchargée et
 * suivie de faces locales recalées sur ses métriques.
 */
const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const faces = (css: string, family: string): string[] =>
  (css.match(/@font-face\s*\{[^}]*\}/g) ?? []).filter((face) =>
    face.includes(`font-family: "${family}";`),
  );

describe('Geist sans décalage au chargement', () => {
  const css = read('../styles/geist.css');
  const tokens = read('../styles/tokens.css');
  const layout = read('../layouts/V6Page.astro');

  it('V6Page précharge les deux fichiers servis par geist.css', () => {
    const files = css.match(/\/fonts\/[\w-]+\.woff2/g) ?? [];
    expect(files).toEqual(['/fonts/geist.woff2', '/fonts/geist-mono.woff2']);
    for (const file of files) {
      expect(layout).toContain(
        `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin />`,
      );
    }
  });

  it('les replis recalés passent avant les polices système', () => {
    expect(tokens).toContain(
      '--sans: "Geist", "Geist Repli", "Geist Repli DV", system-ui, sans-serif;',
    );
    expect(tokens).toContain(
      '--mono: "Geist Mono", "Geist Mono Repli", ui-monospace, monospace;',
    );
  });

  it('chaque repli couvre 100 à 900 et porte ses métriques', () => {
    for (const family of ['Geist Repli', 'Geist Repli DV']) {
      const list = faces(css, family);
      const ranges = list.map((face) =>
        (face.match(/font-weight: (\d+) (\d+);/) ?? []).slice(1).map(Number),
      );
      expect(ranges[0]?.[0]).toBe(100);
      expect(ranges.at(-1)?.[1]).toBe(900);
      ranges.slice(1).forEach(([from], i) => {
        expect(from).toBe((ranges[i]?.[1] ?? 0) + 1);
      });
      for (const face of list) {
        expect(face).toMatch(/src:\s+local\(/);
        for (const prop of [
          'size-adjust',
          'ascent-override',
          'descent-override',
        ])
          expect(face).toMatch(new RegExp(`${prop}: [\\d.]+%;`));
      }
    }
    expect(faces(css, 'Geist Mono Repli')).toHaveLength(1);
  });
});
