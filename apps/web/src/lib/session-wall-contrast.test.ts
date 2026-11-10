import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('B1 — paroi de session opaque en sombre étroit', () => {
  it('fixe un fond opaque pour le bandeau à 390 px et moins', () => {
    const css = readFileSync(
      new URL('../styles/theme-dark.css', import.meta.url),
      'utf8',
    );
    expect(css).toMatch(/max-width:\s*390px/);
    expect(css).toMatch(
      /session-wall(?:\.report-message)?\s*\{[^}]*background-color:\s*#1c2340/s,
    );
  });
});
