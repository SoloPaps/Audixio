import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('apps/web/src/styles/v6.css', 'utf8');

const pieces = [
  '.btn',
  '.btn-s',
  '.btn--ghost',
  '.lnk',
  '.card-l',
  '.card',
  '.switch',
];

describe('états des composants v6', () => {
  it('prévoit survol, focus visible, actif, désactivé et mouvement réduit', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('transition: none');
    for (const piece of pieces) {
      expect(css, piece).toContain(`${piece}:hover`);
      expect(css, piece).toContain(`${piece}:active`);
    }
    expect(css).toContain(':disabled');
    expect(css).toContain('[aria-disabled="true"]');
    expect(css).toContain('.dock a:hover');
    expect(css).toContain('.dock a:active');
    expect(css).toContain('.dock button:hover');
    expect(css).toContain('footer a:hover');
    expect(css).toContain('.nav a:hover');
    expect(css).toContain('.field:focus-within');
    expect(css).toContain('.inp input');
  });
});
