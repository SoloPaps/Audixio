import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slim } from '../i18n/slim.js';
import { v6En } from '../i18n/v6-en.js';
import { v6Fr } from '../i18n/v6-fr.js';
import { accountHref, accountKey, NAV_ITEMS } from './nav-canon.js';

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

const canon = readFileSync(
  new URL('../components/CanonBar.svelte', import.meta.url),
  'utf8',
);
const header = readFileSync(
  new URL('../components/v6/SiteHeader.svelte', import.meta.url),
  'utf8',
);

describe('nav v6 identique à la barre actuelle', () => {
  it('reprend les mêmes entrées, dans le même ordre, en français et en anglais', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/methode',
      '/sites',
      '/pro',
    ]);
    expect(NAV_ITEMS.map((item) => slim[item.key])).toEqual([
      'Accueil',
      'Méthode',
      'Sites suivis',
      'Tarifs',
    ]);
    expect(NAV_ITEMS.map((item) => en[item.key])).toEqual([
      'Home',
      'Method',
      'Tracked sites',
      'Pricing',
    ]);
    expect(slim['nav.login']).toBe('Connexion');
    expect(en['nav.login']).toBe('Sign in');
    expect(slim['nav.account']).toBe('Compte');
    expect(en['nav.account']).toBe('Account');
  });

  it('pointe vers le compte si la session est ouverte, sinon vers la connexion', () => {
    expect(accountHref(false)).toBe('/connexion');
    expect(accountKey(false)).toBe('nav.login');
    expect(accountHref(true)).toBe('/compte');
    expect(accountKey(true)).toBe('nav.account');
  });

  it('est la source des deux barres', () => {
    expect(canon).toContain('nav-canon');
    expect(canon).toContain('NAV_ITEMS');
    expect(canon).toContain('accountHref');
    expect(canon).toContain('accountKey');
    expect(header).toContain('CanonBar');
    expect(header).toContain('shell="v6"');
  });
});

describe('le chrome v6 dit « Tarifs », comme la barre', () => {
  it('le pied de page reprend le libellé de la nav, en français et en anglais', () => {
    expect(v6Fr['v6.footer.offers']).toBe(slim['nav.pricing']);
    expect(v6En['v6.footer.offers']).toBe(en['nav.pricing']);
    expect(en['v6.footer.offers']).toBe(en['nav.pricing']);
  });

  it('n’emploie plus « Offres » ni « Plans »', () => {
    expect(Object.values(v6Fr).join(' ')).not.toMatch(/\bOffres\b/);
    expect(Object.values(v6En).join(' ')).not.toMatch(/\bPlans\b/);
  });
});
