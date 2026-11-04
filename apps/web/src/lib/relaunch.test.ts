import { describe, expect, it } from 'vitest';
import { progressionHref, relaunchHref, retryHref } from './relaunch.js';

describe('relance', () => {
  it('la progression porte l’id reçu, pas un rapport', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const href = progressionHref(id);
    expect(href).toBe(`/progression?id=${id}`);
    expect(href).not.toContain('/rapport');
  });

  it('relancer ouvre la progression du site, pas /lancer', () => {
    expect(relaunchHref('site-1')).toBe('/progression?site=site-1');
    expect(relaunchHref('site-1')).not.toContain('/lancer');
    expect(relaunchHref('site-1', 'https://exemple.fr')).toBe(
      '/progression?site=site-1&url=https%3A%2F%2Fexemple.fr',
    );
  });

  it('relancer un audit échoué rouvre la progression du même site, jamais la démo', () => {
    const href = retryHref({ id: 'site-1', url: 'https://exemple.fr' });
    expect(href).toBe('/progression?site=site-1&url=https%3A%2F%2Fexemple.fr');
    expect(retryHref(null)).toBe('/');
    expect(retryHref(null)).not.toBe('/progression');
  });
});
