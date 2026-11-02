import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('aperçu domaine verrouillé', () => {
  it('ne nomme aucun contrôle réel', () => {
    const source = readFileSync(
      new URL('../components/DomainLockedView.svelte', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/HSTS|X-Frame|CSP|Content-Security/i);
  });
});
