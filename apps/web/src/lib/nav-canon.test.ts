import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accueilEn } from '../i18n/accueil-en.js';
import { accueilFr } from '../i18n/accueil-fr.js';
import { fr } from '../i18n/fr.js';
import { slim } from '../i18n/slim.js';
import { v6En } from '../i18n/v6-en.js';
import { v6Fr } from '../i18n/v6-fr.js';
import {
  accountHref,
  accountKey,
  FOOTER_COLUMNS,
  navItems,
  SCAN_HREF,
} from './nav-canon.js';

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const footer = readFileSync(
  new URL('../components/v6/SiteFooter.astro', import.meta.url),
  'utf8',
);
const header = readFileSync(
  new URL('../components/v6/SiteHeader.svelte', import.meta.url),
  'utf8',
);
// L’en-tête v6 est le seul composant de barre (CanonBar supprimé, lot 6).
const canon = header;

describe('barre : visiteur et connecté (STRUCTURE.md §1)', () => {
  it('visiteur : trois entrées, dans l’ordre, en français et en anglais', () => {
    expect(navItems(false).map((item) => item.href)).toEqual([
      '/methode',
      '/exemple-rapport',
      '/pro',
    ]);
    expect(navItems(false).map((item) => slim[item.key])).toEqual([
      'Comment ça marche',
      'Exemple de rapport',
      'Tarifs',
    ]);
    expect(navItems(false).map((item) => en[item.key])).toEqual([
      'How it works',
      'Sample report',
      'Pricing',
    ]);
  });

  it('connecté : Mes sites, puis Compte à la place de Connexion', () => {
    expect(navItems(true).map((item) => item.href)).toEqual(['/sites']);
    expect(navItems(true).map((item) => slim[item.key])).toEqual(['Mes sites']);
    expect(navItems(true).map((item) => en[item.key])).toEqual(['My sites']);
    expect(slim['nav.login']).toBe('Connexion');
    expect(en['nav.login']).toBe('Sign in');
    expect(slim['nav.account']).toBe('Compte');
    expect(en['nav.account']).toBe('Account');
  });

  it('n’a plus d’entrée « Accueil » : le logo mène à /', () => {
    for (const loggedIn of [false, true]) {
      expect(navItems(loggedIn).map((item) => item.href)).not.toContain('/');
    }
    expect(canon).toContain('class="axn-logo" href="/"');
  });

  it('bouton principal « Scanner mon site » vers le formulaire du héros', () => {
    expect(SCAN_HREF).toBe('/#audit-form');
    expect(slim['nav.scan']).toBe('Scanner mon site');
    expect(en['nav.scan']).toBe('Scan my site');
  });

  it('pointe vers le compte si la session est ouverte, sinon vers la connexion', () => {
    expect(accountHref(false)).toBe('/connexion');
    expect(accountKey(false)).toBe('nav.login');
    expect(accountHref(true)).toBe('/compte');
    expect(accountKey(true)).toBe('nav.account');
  });

  it('est la source des deux barres', () => {
    expect(canon).toContain('nav-canon');
    expect(canon).toContain('navItems');
    expect(canon).toContain('SCAN_HREF');
    expect(canon).toContain('accountHref');
    expect(canon).toContain('accountKey');
    expect(header).not.toContain('CanonBar');
    expect(header).toContain('id="axn"');
  });
});

describe('pied de page en trois colonnes (STRUCTURE.md §2)', () => {
  it('Produit, Transparence, Légal, en français et en anglais', () => {
    expect(FOOTER_COLUMNS.map((col) => fr[col.key])).toEqual([
      'Produit',
      'Transparence',
      'Légal',
    ]);
    expect(FOOTER_COLUMNS.map((col) => en[col.key])).toEqual([
      'Product',
      'Transparency',
      'Legal',
    ]);
  });

  it('chaque colonne garde ses liens, dans l’ordre', () => {
    expect(
      FOOTER_COLUMNS.map((col) => col.links.map((link) => link.href)),
    ).toEqual([
      ['/methode', '/exemple-rapport', '/pro', '/#audit-form'],
      ['/robot', '/ecoconception', '/accessibilite'],
      ['/mentions-legales', '/cgu', '/confidentialite', '/cookies'],
    ]);
    for (const col of FOOTER_COLUMNS) {
      for (const link of col.links) {
        expect(fr[link.key], link.key).toBeTruthy();
        expect(en[link.key], link.key).toBeTruthy();
      }
    }
  });

  it('reprend les libellés de la barre pour les mêmes pages', () => {
    const product = FOOTER_COLUMNS[0].links.map((link) => link.key);
    expect(product).toEqual([
      'nav.how',
      'nav.example',
      'nav.pricing',
      'nav.scan',
    ]);
    expect(footer).toContain('FOOTER_COLUMNS');
  });
});

describe('le chrome v6 dit « Tarifs »', () => {
  it('n’emploie plus « Offres » ni « Plans », ni dans la v6 ni sur l’accueil', () => {
    for (const text of [v6Fr, accueilFr].map((pack) =>
      Object.values(pack).join(' '),
    )) {
      expect(text).not.toMatch(/\bOffres\b/);
    }
    for (const text of [v6En, accueilEn].map((pack) =>
      Object.values(pack).join(' '),
    )) {
      expect(text).not.toMatch(/\bPlans\b/);
    }
  });
});

describe('durée annoncée : « en quelques minutes »', () => {
  it('ni « ~1 minute » ni « une minute » dans les catalogues FR et EN', () => {
    const fr = readFileSync(
      new URL('../../public/dictionnaire-fr.json', import.meta.url),
      'utf8',
    );
    const english = JSON.stringify(en);
    for (const text of [fr, english]) {
      expect(text).not.toMatch(/~\s?1 minute|une minute|one minute/i);
    }
    expect(JSON.parse(fr)['home.guarantees.time']).toBe(
      'Résultats complets en quelques minutes',
    );
    expect(en['home.guarantees.time']).toBe(
      'Complete results in a few minutes',
    );
  });
});
