import { describe, expect, it } from 'vitest';
import { loginHref, safeNext, signupHref } from './nav.js';

describe('safeNext', () => {
  it('garde un chemin du site', () => {
    expect(safeNext('/lancer?url=exemple.fr')).toBe('/lancer?url=exemple.fr');
    expect(safeNext(null)).toBe('/sites');
  });

  it('envoie vers la connexion ou l’inscription du site', () => {
    expect(loginHref('/compte')).toBe('/connexion?next=%2Fcompte');
    expect(signupHref('/historique')).toBe('/inscription?next=%2Fhistorique');
    expect(loginHref('https://exemple.fr')).toBe('/connexion?next=%2Fsites');
  });

  it('refuse une adresse externe', () => {
    expect(safeNext('https://exemple.fr')).toBe('/sites');
    expect(safeNext('//exemple.fr')).toBe('/sites');
    expect(safeNext('/\\exemple.fr')).toBe('/sites');
    expect(safeNext('/ok\n')).toBe('/sites');
  });
});
