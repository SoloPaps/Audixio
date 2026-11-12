import { describe, expect, it } from 'vitest';
import {
  isSiteHost,
  parseSiteRoute,
  sectionOf,
  siteHref,
  siteIdHref,
} from './site-route.js';

const ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

describe('adresses de la page d’un site', () => {
  it('produit /sites/:host et ses sections', () => {
    expect(siteHref('Exemple.fr')).toBe('/sites/exemple.fr');
    expect(siteHref('exemple.fr', 'historique')).toBe(
      '/sites/exemple.fr#historique',
    );
    expect(siteHref('localhost:8080', 'verification')).toBe(
      '/sites/localhost%3A8080#verification',
    );
    expect(siteIdHref(ID, 'partage')).toBe(`/sites/id/${ID}#partage`);
  });

  it('lit l’hôte ou l’identifiant, refuse le reste', () => {
    expect(parseSiteRoute('/sites/exemple.fr')).toEqual({
      kind: 'host',
      host: 'exemple.fr',
    });
    expect(parseSiteRoute('/sites/WWW.Exemple.fr/')).toEqual({
      kind: 'host',
      host: 'www.exemple.fr',
    });
    expect(parseSiteRoute('/sites/localhost%3A8080')).toEqual({
      kind: 'host',
      host: 'localhost:8080',
    });
    expect(parseSiteRoute(`/sites/id/${ID}`)).toEqual({ kind: 'id', id: ID });
    expect(parseSiteRoute('/sites/id/pas-un-id')).toEqual({ kind: 'none' });
    expect(parseSiteRoute('/sites/fiche/')).toEqual({ kind: 'none' });
    expect(parseSiteRoute('/sites/a b')).toEqual({ kind: 'none' });
    expect(parseSiteRoute('/sites/%E0%A4%A')).toEqual({ kind: 'none' });
    expect(parseSiteRoute('/sites')).toEqual({ kind: 'none' });
    expect(isSiteHost('-x.fr')).toBe(false);
  });

  it('choisit la section de l’ancre, sinon les audits', () => {
    expect(sectionOf('#historique')).toBe('historique');
    expect(sectionOf('#inconnue')).toBe('audits');
    expect(sectionOf('')).toBe('audits');
  });
});
