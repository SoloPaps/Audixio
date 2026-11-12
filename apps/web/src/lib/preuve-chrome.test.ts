import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('preuve', () => {
  it('affiche les méthodes au-dessus du menu de l’accueil', () => {
    const css = readFileSync(
      'apps/web/src/styles/maquettes/preuve-v6.css',
      'utf8',
    );
    expect(css).toMatch(/\.pv \.tabs \{[^}]*display:\s*grid/s);
  });

  it('ne propose plus un résultat simulé', () => {
    const view = readFileSync(
      'apps/web/src/components/VerificationPanel.svelte',
      'utf8',
    );
    expect(view).not.toContain('preuve.sim');
  });
});
