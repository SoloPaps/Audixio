import { describe, expect, it } from 'vitest';
import {
  badgePageHref,
  checkHref,
  domainHref,
  parseReportRoute,
  reportHref,
  shareHref,
} from './report-route.js';

const ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

describe('adresses du rapport v6', () => {
  it('produit une adresse par onglet', () => {
    expect(reportHref(ID)).toBe(`/rapport/${ID}`);
    expect(domainHref(ID)).toBe(`/rapport/${ID}/domaines`);
    expect(domainHref(ID, 'performance')).toBe(
      `/rapport/${ID}/domaines/performance`,
    );
    expect(checkHref(ID)).toBe(`/rapport/${ID}/constats`);
    expect(checkHref(ID, 'img-alt')).toBe(`/rapport/${ID}/constats/img-alt`);
    expect(reportHref(ID, 'plan')).toBe(`/rapport/${ID}/plan`);
    expect(reportHref(ID, 'brief')).toBe(`/rapport/${ID}/brief`);
    expect(reportHref(ID, 'imprimer')).toBe(`/rapport/${ID}/imprimer`);
    expect(shareHref(ID, 'badge')).toBe(`/rapport/${ID}?partager=badge`);
    expect(badgePageHref(ID)).toBe(`/rapport/${ID}/badge`);
  });

  it('lit le chemin', () => {
    expect(parseReportRoute(`/rapport/${ID}`, '')).toMatchObject({
      id: ID,
      tab: 'resume',
      badge: false,
    });
    expect(
      parseReportRoute(`/rapport/${ID}/domaines/securite/`, ''),
    ).toMatchObject({ id: ID, tab: 'domaines', domain: 'securite' });
    expect(parseReportRoute(`/rapport/${ID}/constats/a%20b`, '')).toMatchObject(
      { tab: 'constats', check: 'a b' },
    );
    expect(parseReportRoute(`/rapport/${ID}/plan`, '').tab).toBe('plan');
    expect(parseReportRoute(`/rapport/${ID}/badge`, '').badge).toBe(true);
  });

  it('lit encore les anciennes requêtes', () => {
    expect(parseReportRoute('/rapport/', `?id=${ID}`)).toMatchObject({
      id: ID,
      tab: 'resume',
    });
    expect(parseReportRoute('/domaine', `?id=${ID}&domaine=seo`)).toMatchObject(
      { tab: 'domaines', domain: 'seo' },
    );
    expect(parseReportRoute('/constat/', `?id=${ID}&check=x`)).toMatchObject({
      tab: 'constats',
      check: 'x',
    });
    expect(parseReportRoute('/badge', `?id=${ID}`).badge).toBe(true);
  });

  it('ne prend pas une page statique pour un identifiant', () => {
    expect(parseReportRoute('/rapport/domaines/', '').id).toBe('');
    expect(parseReportRoute('/rapport/imprimer/', `?id=${ID}`)).toMatchObject({
      id: ID,
      tab: 'imprimer',
    });
  });
});
