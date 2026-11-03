import { describe, expect, it } from 'vitest';
import { historySource, pickHistorySite } from './account-history.js';

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
