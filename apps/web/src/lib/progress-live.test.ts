import { describe, expect, it } from 'vitest';
import {
  guestBeatPhase,
  guestDisplayStatus,
  nothingMeasured,
  progressEta,
  progressLive,
  progressPhase,
  runnerGap,
} from './progress-live.js';

describe('nothingMeasured', () => {
  it('refuse une note absente et garde une note 0 mesurée', () => {
    expect(nothingMeasured([])).toBe(true);
    expect(nothingMeasured([{ score: null }, { score: null }])).toBe(true);
    expect(nothingMeasured([{ score: 0 }])).toBe(false);
    expect(nothingMeasured([{ score: null }, { score: 72 }])).toBe(false);
  });
});

describe('guestBeatPhase', () => {
  it('avance de DNS aux pages, puis à la vie privée', () => {
    expect(guestBeatPhase(0)).toBe('Phase : DNS.');
    expect(guestBeatPhase(1)).toBe('Phase : pages.');
    expect(guestBeatPhase(2)).toBe('Phase : vie privée.');
    expect(guestBeatPhase(9)).toBe('Phase : vie privée.');
  });
});

describe('guestDisplayStatus', () => {
  it('montre l’analyse, puis le statut réel déjà stocké', () => {
    expect(guestDisplayStatus('queued', false)).toBe('queued');
    expect(guestDisplayStatus('running', false)).toBe('running');
    expect(guestDisplayStatus('done', false)).toBe('running');
    expect(guestDisplayStatus('partial', false)).toBe('running');
    expect(guestDisplayStatus('failed', false)).toBe('running');
    expect(guestDisplayStatus('done', true)).toBe('done');
    expect(progressLive(guestDisplayStatus('done', false), [])).toBe(
      'Analyse en cours.',
    );
    expect(progressLive(guestDisplayStatus('done', true), [])).toBe(
      'Rapport prêt.',
    );
  });
});

describe('progressLive', () => {
  it('annonce l’analyse, puis le domaine, puis le rapport', () => {
    expect(progressLive('queued', [])).toBe('Analyse en cours.');
    expect(progressLive('running', [])).toBe('Analyse en cours.');
    expect(progressLive('running', ['Visibilité sur Google'])).toBe(
      'Visibilité sur Google',
    );
    expect(progressLive('done', ['Visibilité sur Google'])).toBe(
      'Rapport prêt.',
    );
    expect(progressLive('failed', [])).toContain('abouti');
  });

  it('dit que le navigateur d’audit n’a pas tourné', () => {
    expect(runnerGap([{ reason: 'reason.runner_absent' }])).toBe(
      'Non testé : le navigateur d’audit n’a pas tourné.',
    );
    expect(runnerGap([{ reason: null }])).toBeNull();
  });
});

describe('progressEta', () => {
  it('donne une fourchette, puis plus rien', () => {
    expect(progressEta('queued', 0)).toBe('Comptez encore 2 à 4 minutes.');
    expect(progressEta('running', 2)).toBe('Comptez encore 1 à 3 minutes.');
    expect(progressEta('running', 5)).toBe(
      'Comptez encore moins de 2 minutes.',
    );
    expect(progressEta('done', 8)).toBeNull();
  });
});

describe('progressPhase', () => {
  it('nomme la phase sans inventer une étape', () => {
    expect(progressPhase('queued', 0, false)).toBe('Phase : file d’attente.');
    expect(progressPhase('running', 0, false)).toBe('Phase : DNS.');
    expect(progressPhase('running', 2, false)).toBe('Phase : pages.');
    expect(progressPhase('running', 5, false)).toBe('Phase : vie privée.');
    expect(progressPhase('running', 6, true)).toBe(
      'Phase : dernières mesures.',
    );
    expect(progressPhase('done', 8, true)).toBeNull();
  });
});
