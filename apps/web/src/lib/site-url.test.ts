import { describe, expect, it } from 'vitest';
import {
  InvalidSiteUrl,
  isCompleteHttpUrl,
  normalizeSiteUrl,
} from './site-url.js';

describe('normalizeSiteUrl', () => {
  it('note une origine en https', () => {
    expect(normalizeSiteUrl('Angelique-Osteo.fr')).toEqual({
      url: 'https://angelique-osteo.fr',
      scope: 'origin',
      host: 'angelique-osteo.fr',
      pathPrefix: null,
      hosting: 'other',
      label: 'angelique-osteo.fr',
    });
    expect(normalizeSiteUrl('http://exemple.fr/index.html?x=1#a').url).toBe(
      'https://exemple.fr',
    );
  });

  it('garde un préfixe de chemin', () => {
    expect(
      normalizeSiteUrl('https://solopaps.github.io/Projet-Site-Artiste'),
    ).toMatchObject({
      url: 'https://solopaps.github.io/Projet-Site-Artiste/',
      scope: 'path',
      pathPrefix: '/Projet-Site-Artiste/',
      hosting: 'github_pages',
    });
    expect(normalizeSiteUrl('mon-site.netlify.app').hosting).toBe('netlify');
  });

  it.each([
    '',
    'ftp://exemple.fr',
    'https://user:mdp@exemple.fr',
    'https://exemple.fr:8443',
    'https://192.168.1.10',
    'https://[::1]/',
    'https://localhost',
    'https://intranet',
    'https://site.test',
    'https://bon.audigy.test',
  ])('refuse %s', (raw) => {
    expect(() => normalizeSiteUrl(raw)).toThrow(InvalidSiteUrl);
  });

  it('accepte seulement *.audigy.test quand le labo est autorisé', () => {
    expect(
      normalizeSiteUrl('https://bon.audigy.test/', { allowLab: true }),
    ).toMatchObject({
      url: 'https://bon.audigy.test',
      host: 'bon.audigy.test',
      scope: 'origin',
    });
    expect(() =>
      normalizeSiteUrl('https://autre.test', { allowLab: true }),
    ).toThrow(InvalidSiteUrl);
    expect(() =>
      normalizeSiteUrl('https://site.example', { allowLab: true }),
    ).toThrow(InvalidSiteUrl);
  });
});

describe('isCompleteHttpUrl', () => {
  it('accepte une adresse complète et refuse un nom seul', () => {
    expect(isCompleteHttpUrl('https://exemple.fr')).toBe(true);
    expect(isCompleteHttpUrl('http://exemple.fr/chemin')).toBe(true);
    expect(isCompleteHttpUrl('exemple.fr')).toBe(false);
    expect(isCompleteHttpUrl('')).toBe(false);
    expect(isCompleteHttpUrl('ftp://exemple.fr')).toBe(false);
    expect(isCompleteHttpUrl('https://localhost')).toBe(false);
  });
});
