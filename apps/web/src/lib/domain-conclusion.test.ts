import { describe, expect, it } from 'vitest';
import { t } from '../i18n/index.js';
import {
  domainLede,
  hubConclusion,
  shownConclusion,
} from './domain-conclusion.js';

describe('conclusion de domaine', () => {
  it('n’invente pas une conclusion quand le domaine n’est pas testé', () => {
    expect(
      hubConclusion({
        locked: false,
        score: null,
        summary: 'Le site met un peu trop de temps à s’afficher.',
        detail: 'détail',
      }),
    ).toBeNull();
    expect(
      shownConclusion(
        'untested',
        'La page met près de 3 secondes à s’afficher.',
      ),
    ).toBeNull();
  });

  it('garde la conclusion d’un domaine mesuré et le détail verrouillé', () => {
    expect(
      hubConclusion({
        locked: false,
        score: 70,
        summary: 'Correct.',
        detail: 'détail',
      }),
    ).toBe('Correct.');
    expect(
      hubConclusion({
        locked: true,
        score: null,
        summary: 'secret',
        detail: 'Verrouillé',
      }),
    ).toBe('Verrouillé');
    expect(shownConclusion('improve', 'À améliorer.')).toBe('À améliorer.');
  });
});

describe('domainLede (bug #70, #98)', () => {
  it('ne promet pas de corrections quand il n’y a aucun constat', () => {
    expect(domainLede('performance', 'improve', 0, 'Phrase réelle.')).toBe(
      'Phrase réelle.',
    );
  });
  it('garde le texte vitesse quand des corrections existent', () => {
    expect(domainLede('performance', 'improve', 3, 'Phrase réelle.')).toBe(
      t('domaine.lede.speed'),
    );
  });
  it('reste vide pour un domaine non testé', () => {
    expect(domainLede('performance', 'untested', 3, 'x')).toBeNull();
  });
});
