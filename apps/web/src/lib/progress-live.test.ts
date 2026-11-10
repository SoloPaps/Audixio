import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  auditProgress,
  guestBeatPhase,
  guestDisplayStatus,
  holdProgress,
  nextPercent,
  nothingMeasured,
  progressEta,
  progressLive,
  progressPhase,
  runnerGap,
  shouldReplayGuestPreview,
} from './progress-live.js';

function source(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
}

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
  it('un audit visiteur « partial » révélé est terminé : il ne sera jamais relu', () => {
    expect(guestDisplayStatus('partial', true)).toBe('done');
    expect(progressLive(guestDisplayStatus('partial', true), [])).toBe(
      'Rapport prêt.',
    );
  });

  it('montre l’analyse, puis le statut réel déjà stocké', () => {
    expect(guestDisplayStatus('queued', false)).toBe('queued');
    expect(guestDisplayStatus('running', false)).toBe('running');
    expect(guestDisplayStatus('done', false)).toBe('running');
    expect(guestDisplayStatus('partial', false)).toBe('running');
    expect(guestDisplayStatus('failed', false)).toBe('running');
    expect(guestDisplayStatus('done', true)).toBe('done');
    expect(guestDisplayStatus('failed', true)).toBe('failed');
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

describe('audit terminé', () => {
  it('vaut 100 % et aucun domaine encore en cours ou en attente', () => {
    const view = auditProgress({
      status: 'done',
      domains: [
        { domain: 'seo', score: 40, level: 'problem' },
        { domain: 'securite', score: null, level: 'locked', locked: true },
        { domain: 'ecologie', score: null, level: 'untested' },
        { domain: 'dns_email', score: null, level: 'locked', locked: true },
        { domain: 'performance', score: null, level: 'untested' },
        { domain: 'accessibilite', score: 70, level: 'improve' },
        { domain: 'qualite', score: 80, level: 'good' },
        { domain: 'vie_privee', score: null, level: 'locked', locked: true },
      ],
    });
    expect(view.percent).toBe(100);
    expect(view.finished).toBe(true);
    expect(
      view.domains.filter(
        (item) =>
          item.state === 'active' ||
          item.state === 'wait' ||
          item.state === 'next',
      ),
    ).toEqual([]);
    expect(
      view.domains
        .filter((item) => item.state === 'done')
        .map((item) => item.key)
        .sort(),
    ).toEqual(['a11y', 'code', 'seo']);
    expect(view.domains.filter((item) => item.state === 'off')).toHaveLength(5);
  });
});

describe('suivi en direct', () => {
  it('reflète la mesure et s’arrête à la fin ou à l’échec', () => {
    const running = auditProgress({ status: 'running', domains: [] });
    expect(running.poll).toBe(true);
    expect(running.finished).toBe(false);
    expect(running.percent).toBe(0);
    const measured = [
      { domain: 'seo', score: 40, level: 'problem' },
      { domain: 'accessibilite', score: 70, level: 'improve' },
      { domain: 'qualite', score: 80, level: 'good' },
      { domain: 'performance', score: null, level: 'untested' },
    ];
    const partial = auditProgress({ status: 'partial', domains: measured });
    expect(partial.poll).toBe(true);
    expect(partial.finished).toBe(false);
    expect(partial.percent).toBeGreaterThan(running.percent);
    expect(partial.percent).toBeLessThan(100);
    expect(partial.domains.find((item) => item.key === 'seo')?.state).toBe(
      'done',
    );
    expect(partial.domains.find((item) => item.key === 'perf')?.state).toBe(
      'wait',
    );
    const done = auditProgress({ status: 'done', domains: measured });
    expect(done.percent).toBe(100);
    expect(done.poll).toBe(false);
    expect(done.domains.find((item) => item.key === 'seo')?.state).toBe('done');
    expect(done.domains.find((item) => item.key === 'perf')?.state).toBe('off');
    const failed = auditProgress({ status: 'failed', domains: [] });
    expect(failed.poll).toBe(false);
    expect(failed.failed).toBe(true);
    expect(failed.finished).toBe(false);
    expect(failed.percent).not.toBe(100);
    const live = source('../components/ProgressLive.svelte');
    expect(live).toContain('view.poll');
    expect(source('./progress-scene.ts')).toContain('setPercent(0)');
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

describe('M8 — progression monotone après la fin', () => {
  it('ne rejoue pas l’aperçu et ne recule pas après 100 %', () => {
    expect(shouldReplayGuestPreview('done')).toBe(false);
    expect(shouldReplayGuestPreview('partial')).toBe(false);
    expect(shouldReplayGuestPreview('failed')).toBe(false);
    expect(shouldReplayGuestPreview('running')).toBe(true);
    const held = holdProgress(
      { status: 'done', percent: 100 },
      { status: 'running', percent: 0 },
    );
    expect(held).toEqual({ status: 'done', percent: 100 });
    expect(nextPercent(true, 100, 0)).toBe(100);
    expect(nextPercent(false, 40, 10)).toBe(10);
  });
});
