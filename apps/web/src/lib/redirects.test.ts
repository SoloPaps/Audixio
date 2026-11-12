import { describe, expect, it } from 'vitest';
import {
  REDIRECTS,
  renderRedirects,
  resolveRedirect,
  resolveRewrite,
} from './redirects.js';

const ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

// Un cas par ligne de STRUCTURE.md §4 (R11, R12 et R15 arrivent au lot 4).
const CASES: [string, string, string | null][] = [
  ['R1', `/rapport?id=${ID}`, `/rapport/${ID}`],
  ['R2', `/rapport?id=${ID}&domaine=seo`, `/rapport/${ID}/domaines/seo`],
  ['R3', `/rapport?id=${ID}&check=img-alt`, `/rapport/${ID}/constats/img-alt`],
  [
    'R4',
    `/domaine?id=${ID}&domaine=securite`,
    `/rapport/${ID}/domaines/securite`,
  ],
  ['R5', `/domaine?id=${ID}`, `/rapport/${ID}/domaines`],
  ['R6', `/constat?id=${ID}&check=hsts`, `/rapport/${ID}/constats/hsts`],
  ['R7', `/constat?id=${ID}`, `/rapport/${ID}/constats`],
  ['R8', `/plan?id=${ID}`, `/rapport/${ID}/plan`],
  ['R9', `/brief?id=${ID}`, `/rapport/${ID}/brief`],
  ['R10', `/rapport/imprimer?id=${ID}`, `/rapport/${ID}/imprimer`],
  ['R13', `/badge?id=${ID}`, `/rapport/${ID}?partager=badge`],
  ['R4–R9 sans id', '/domaine?domaine=seo', '/rapport/domaines?domaine=seo'],
  ['R6–R7 sans id', '/constat', '/rapport/constats'],
  ['R8 sans id', '/plan', '/rapport/plan'],
  ['R9 sans id', '/brief/', '/rapport/brief'],
  ['R13 sans id', '/badge', '/rapport/badge'],
  ['R14', '/passer-pro?from=hub', null],
  ['R16', '/progression?site=a&url=https%3A%2F%2Fa.fr', null],
  ['R17', '/partage/abc', null],
  ['R17', '/score/exemple-fr', null],
  ['R17', `/verifier/${ID}`, null],
];

describe('table des redirections', () => {
  it.each(CASES)('%s : %s', (_code, from, to) => {
    const url = new URL(from, 'https://audixio.fr');
    expect(resolveRedirect(url.pathname, url.search)).toBe(to);
  });

  it('accepte la barre finale et garde les autres paramètres', () => {
    expect(resolveRedirect('/rapport/', `?id=${ID}&utm=mail`)).toBe(
      `/rapport/${ID}?utm=mail`,
    );
    expect(resolveRedirect('/badge/', `?id=${ID}&x=1`)).toBe(
      `/rapport/${ID}?partager=badge&x=1`,
    );
  });

  it('encode les valeurs et ignore une requête vide', () => {
    expect(resolveRedirect('/constat', `?id=${ID}&check=a%2Fb`)).toBe(
      `/rapport/${ID}/constats/a%2Fb`,
    );
    expect(resolveRedirect('/rapport', '?id=')).toBeNull();
    expect(resolveRedirect('/plan', '?id=')).toBe('/rapport/plan?id=');
    expect(resolveRedirect(`/rapport/${ID}`, '')).toBeNull();
  });

  it('place les règles à plusieurs paramètres en premier', () => {
    const counts = REDIRECTS.map((rule) => Object.keys(rule.query).length);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('sert la page de chaque onglet sans changer l’adresse', () => {
    expect(resolveRewrite(`/rapport/${ID}`)).toBe('/rapport/index.html');
    expect(resolveRewrite(`/rapport/${ID}/`)).toBe('/rapport/index.html');
    expect(resolveRewrite(`/rapport/${ID}/domaines`)).toBe(
      '/rapport/domaines/index.html',
    );
    expect(resolveRewrite(`/rapport/${ID}/domaines/seo`)).toBe(
      '/rapport/domaines/index.html',
    );
    expect(resolveRewrite(`/rapport/${ID}/constats/x/`)).toBe(
      '/rapport/constats/index.html',
    );
    expect(resolveRewrite(`/rapport/${ID}/plan`)).toBe(
      '/rapport/plan/index.html',
    );
    expect(resolveRewrite(`/rapport/${ID}/badge`)).toBe(
      '/rapport/badge/index.html',
    );
    expect(resolveRewrite(`/rapport/${ID}/imprimer`)).toBe(
      '/rapport/imprimer/index.html',
    );
    expect(resolveRewrite('/rapport/domaines/')).toBeNull();
    expect(resolveRewrite('/rapport/')).toBeNull();
    expect(resolveRewrite(`/rapport/${ID}/plan/x`)).toBeNull();
    expect(resolveRewrite('/sites')).toBeNull();
  });

  it('écrit le fichier Netlify, 301 forcés avant les réécritures', () => {
    const text = renderRedirects();
    const lines = text.trim().split('\n').slice(1);
    expect(lines).toContain(
      '/rapport id=:id domaine=:d /rapport/:id/domaines/:d 301!',
    );
    expect(lines).toContain('/badge id=:id /rapport/:id?partager=badge 301!');
    expect(lines).toContain('/rapport/:id /rapport/index.html 200');
    expect(lines).toContain('/plan /rapport/plan 301!');
    const firstRewrite = lines.findIndex((line) => line.endsWith(' 200'));
    expect(lines.slice(firstRewrite).every((l) => l.endsWith(' 200'))).toBe(
      true,
    );
    expect(
      lines.indexOf('/rapport id=:id domaine=:d /rapport/:id/domaines/:d 301!'),
    ).toBeLessThan(lines.indexOf('/rapport id=:id /rapport/:id 301!'));
  });
});
