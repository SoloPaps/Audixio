import { describe, expect, it } from 'vitest';
import { homeUrlIssue, withScheme } from './home-url-issue.js';

const MESSAGE = 'Indiquez une adresse complète, comme https://exemple.fr.';

describe('adresse saisie sur l’accueil', () => {
  it('ajoute https:// à un nom de domaine seul', () => {
    expect(withScheme('monsite.fr')).toBe('https://monsite.fr');
    expect(withScheme('  monsite.fr/blog ')).toBe('https://monsite.fr/blog');
    expect(withScheme('//monsite.fr')).toBe('https://monsite.fr');
  });

  it('garde une adresse qui a déjà son protocole', () => {
    expect(withScheme('https://exemple.fr')).toBe('https://exemple.fr');
    expect(withScheme('http://exemple.fr')).toBe('http://exemple.fr');
    expect(withScheme('ftp://exemple.fr')).toBe('ftp://exemple.fr');
  });

  it('laisse le contrôle refuser ce qui n’est pas une adresse', () => {
    expect(homeUrlIssue(withScheme('not a url'), MESSAGE)).toBe(MESSAGE);
    expect(homeUrlIssue(withScheme(''), MESSAGE)).toBe(MESSAGE);
    expect(homeUrlIssue(withScheme('ftp://exemple.fr'), MESSAGE)).toBe(MESSAGE);
    expect(homeUrlIssue(withScheme('monsite.fr'), MESSAGE)).toBeNull();
  });
});
