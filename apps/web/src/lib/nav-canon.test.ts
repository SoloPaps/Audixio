import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slim } from '../i18n/slim.js';
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
