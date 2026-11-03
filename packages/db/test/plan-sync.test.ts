import { describe, expect, it } from 'vitest';
import { reconcilePlan } from '../src/plan-sync.js';

const AT = new Date('2026-11-03T08:00:00.000Z');

function item(
  id: string,
  checkId: string,
  status: 'todo' | 'doing' | 'done' | 'auto_closed',
  domain = 'seo',
) {
  return { id, checkId, domain, status };
}

describe('fermeture automatique du plan', () => {
  it('ferme une tâche encore ouverte quand le constat passe', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'doing')],
      [{ checkId: 'seo.titre', domain: 'seo', status: 'pass' }],
      [],
      AT,
    );
    expect(changes).toEqual([
      {
        id: 'a',
        checkId: 'seo.titre',
        domain: 'seo',
        from: 'doing',
        to: 'auto_closed',
        reason: 'corrige',
        at: '2026-11-03T08:00:00.000Z',
      },
    ]);
  });

  it('ne referme pas une tâche déjà faite par la personne', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'done')],
      [{ checkId: 'seo.titre', domain: 'seo', status: 'pass' }],
      [],
      AT,
    );
    expect(changes).toEqual([]);
  });

  it('ne ferme pas sans preuve que le constat est corrigé', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'todo'), item('b', 'seo.autre', 'todo')],
      [
        { checkId: 'seo.titre', domain: 'seo', status: 'untested' },
        { checkId: 'seo.autre', domain: 'seo', status: 'na' },
      ],
      [],
      AT,
    );
    expect(changes).toEqual([]);
  });

  it('rouvre une tâche fermée seule si le problème revient', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'auto_closed')],
      [{ checkId: 'seo.titre', domain: 'seo', status: 'fail' }],
      [{ checkId: 'seo.titre', from: 'doing' }],
      AT,
    );
    expect(changes).toEqual([
      {
        id: 'a',
        checkId: 'seo.titre',
        domain: 'seo',
        from: 'auto_closed',
        to: 'doing',
        reason: 'revenu',
        at: '2026-11-03T08:00:00.000Z',
      },
    ]);
  });

  it('rouvre sur à faire si la trace précédente manque', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'auto_closed')],
      [{ checkId: 'seo.titre', domain: 'seo', status: 'warn' }],
      [],
      AT,
    );
    expect(changes[0]?.to).toBe('todo');
    expect(changes[0]?.reason).toBe('revenu');
  });

  it('un échec l’emporte sur une réussite du même constat', () => {
    const changes = reconcilePlan(
      [item('a', 'seo.titre', 'todo')],
      [
        { checkId: 'seo.titre', domain: 'seo', status: 'pass' },
        { checkId: 'seo.titre', domain: 'seo', status: 'fail' },
      ],
      [],
      AT,
    );
    expect(changes).toEqual([]);
  });

  it('ignore un autre domaine et ne touche pas au reste', () => {
    const changes = reconcilePlan(
      [
        item('a', 'seo.titre', 'todo'),
        item('b', 'perf.poids', 'doing', 'performance'),
      ],
      [{ checkId: 'seo.titre', domain: 'performance', status: 'pass' }],
      [],
      AT,
    );
    expect(changes).toEqual([]);
  });
});
