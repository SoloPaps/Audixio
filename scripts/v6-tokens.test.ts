import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync('apps/web/src/styles/tokens.css', 'utf8');
const dark = readFileSync('apps/web/src/styles/theme-dark.css', 'utf8');

const light = tokens.slice(tokens.indexOf('[data-v6]'));

describe('jetons v6', () => {
  it('pose le clair sémantique dans tokens.css, sans couleur sombre', () => {
    expect(light).toContain('--bg: #f3f5f8');
    expect(light).toContain('--ink: #0b1220');
    expect(light).toContain('--beam: #1d5fd1');
    expect(light).toContain('--cta: #0b1220');
    expect(light).toContain('--cta-fg: #ffffff');
    expect(light).toContain('--find: #c2341f');
    expect(light).toContain('--ok: #0f7a55');
    expect(light).toContain('--gA: #0f7a55');
    expect(light).toContain('--gF: #8a1538');
    expect(light).toContain('--sans: "Geist"');
    expect(light).toContain('--mono: "Geist Mono"');
    expect(light).not.toMatch(/--d-[a-z0-9]+\s*:/);
    for (const banned of ['#06090d', '#7cc4ff', '#e8eef6', '#ff7a6b']) {
      expect(light.toLowerCase()).not.toContain(banned);
    }
  });

  it('relaye le sombre uniquement par des --d-v* dans theme-dark.css', () => {
    expect(dark).toContain('html[data-theme="dark"][data-v6]');
    expect(dark).toContain('--d-vbg: #06090d');
    expect(dark).toContain('--d-vtx: #e8eef6');
    expect(dark).toContain('--d-vbeam: #7cc4ff');
    expect(dark).toContain('--d-vcta: #7cc4ff');
    expect(dark).toContain('--d-vctafg: #061018');
    expect(dark).toContain('--d-vfind: #ff7a6b');
    expect(dark).toContain('--d-vok: #5ee0b0');
    expect(dark).toContain('--bg: var(--d-vbg)');
    expect(dark).toContain('--ink: var(--d-vtx)');
    expect(dark).toContain('--beam: var(--d-vbeam)');
    expect(dark).toContain('--cta: var(--d-vcta)');
    expect(dark).toContain('color-scheme: dark');
    expect(tokens).not.toContain('#06090d');
  });
});

describe('Geist auto-hébergé', () => {
  it('sert les woff2 locaux, sans police distante', () => {
    expect(statSync('apps/web/public/fonts/geist.woff2').size).toBeGreaterThan(
      1000,
    );
    expect(
      statSync('apps/web/public/fonts/geist-mono.woff2').size,
    ).toBeGreaterThan(1000);
    const css = readFileSync('apps/web/src/styles/geist.css', 'utf8');
    expect(css).toContain('font-family: "Geist"');
    expect(css).toContain('font-family: "Geist Mono"');
    expect(css).toContain('/fonts/geist.woff2');
    expect(css).toContain('/fonts/geist-mono.woff2');
    expect(css).toContain('font-display: swap');
    expect(css.toLowerCase()).not.toContain('fonts.googleapis.com');
    expect(
      readFileSync('apps/web/public/fonts/OFL-geist.txt', 'utf8'),
    ).toContain('SIL Open Font License');
  });
});
