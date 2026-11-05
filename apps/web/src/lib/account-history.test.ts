import { describe, expect, it } from 'vitest';
import {
  askedHistorySite,
  historySource,
  pickHistorySite,
} from './account-history.js';

const SITE = {
  id: '00000000-0000-4000-8000-0000000000b2',
  host: 'bon.audigy.test',
  hosting: 'other',
};

describe('historySource', () => {
  it('garde la maquette quand la réponse n’est pas une liste', () => {
    expect(historySource(null).kind).toBe('demo');
    expect(historySource({ host: 'monsite-exemple.fr' }).kind).toBe('demo');
  });

  it('n’affiche pas l’exemple quand le compte n’a pas de site', () => {
    expect(historySource([])).toEqual({ kind: 'empty' });
    expect(historySource([{ id: '', host: 'monsite-exemple.fr' }])).toEqual({
      kind: 'empty',
    });
  });

  it('garde tous les sites et préfère celui qui a un audit', () => {
    const other = { id: 'x', host: 'autre.test', hosting: 'other' };
    expect(historySource([SITE, { id: 'x', host: 'autre.test' }])).toEqual({
      kind: 'live',
      sites: [SITE, other],
    });
    expect(pickHistorySite([SITE, other], 'x')).toEqual(other);
    expect(pickHistorySite([SITE, other], null)).toEqual(SITE);
    expect(pickHistorySite([SITE, other], 'absent')).toEqual(SITE);
  });
});

describe('site demandé par ?site= (retest C2)', () => {
  const MINE = {
    id: '00000000-0000-4000-8000-0000000000a2',
    host: 'gratuit.audigy.test',
    hosting: 'other',
  };
  const OTHER = '00000000-0000-4000-8000-0000000000b2';

  it('site du compte déjà listé : pas de requête', async () => {
    let calls = 0;
    const site = await askedHistorySite(MINE.id, [MINE], async () => {
      calls += 1;
      return [];
    });
    expect(site).toEqual(MINE);
    expect(calls).toBe(0);
  });

  it('site d’un autre compte ou inconnu : null', async () => {
    expect(await askedHistorySite(OTHER, [MINE], async () => [])).toBeNull();
    expect(await askedHistorySite(OTHER, [MINE], async () => null)).toBeNull();
  });

  it('identifiant mal formé : null sans requête', async () => {
    let calls = 0;
    const read = async () => {
      calls += 1;
      return [MINE];
    };
    expect(await askedHistorySite('zzz', [MINE], read)).toBeNull();
    expect(await askedHistorySite('', [MINE], read)).toBeNull();
    expect(calls).toBe(0);
  });

  it('site du compte hors des 8 premiers : lu par la requête', async () => {
    const far = { id: OTHER, host: 'loin.audigy.test', hosting: 'netlify' };
    expect(await askedHistorySite(OTHER, [MINE], async () => [far])).toEqual(
      far,
    );
  });

  it('ligne renvoyée pour un autre id : refusée', async () => {
    expect(await askedHistorySite(OTHER, [], async () => [MINE])).toBeNull();
  });
});
