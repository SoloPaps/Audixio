import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(
  new URL('../pages/cookies.astro', import.meta.url),
  'utf8',
);

describe('bandeau cookies', () => {
  it('offre un sélecteur de langue alors que la barre Canon est masquée', () => {
    expect(page).toContain('id="ck-lang"');
    expect(page).toContain("localStorage.setItem('audigy-locale'");
    expect(page).toContain('EN — English');
  });
});
