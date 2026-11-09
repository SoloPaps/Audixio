import { describe, expect, it } from 'vitest';
import { choiceKey, savedChoices } from './finding-choice.js';

// QA Mo 05/11 M2 (bug_3f731721) : /brief écrit `securite.hsts`, /domaine
// lisait `securite.hsts-N` ; les compteurs du domaine ignoraient le brief.
describe('M2 — même clé de choix pour /brief et /domaine', () => {
  it('retire le rang ajouté par le rapport, garde le checkId', () => {
    expect(choiceKey('securite.hsts-12')).toBe('securite.hsts');
    expect(choiceKey('securite.hsts')).toBe('securite.hsts');
    expect(choiceKey('dns_email.spf-0')).toBe('dns_email.spf');
  });

  it('le choix du brief s’applique au constat du domaine', () => {
    const saved = savedChoices([
      {
        finding_id: 'securite.hsts',
        choice: 'fix',
        updated_at: '2026-11-05T22:30:00.000Z',
      },
    ]);
    expect(saved[choiceKey('securite.hsts-4')]).toBe('fix');
  });

  it('une ancienne ligne `checkId-N` compte pour le même constat, la plus récente gagne', () => {
    expect(
      savedChoices([
        {
          finding_id: 'securite.hsts',
          choice: 'fix',
          updated_at: '2026-11-05T22:30:00.000Z',
        },
        {
          finding_id: 'securite.hsts-4',
          choice: 'chk',
          updated_at: '2026-11-05T22:00:00.000Z',
        },
      ]),
    ).toEqual({ 'securite.hsts': 'fix' });
    expect(
      savedChoices([
        {
          finding_id: 'securite.hsts-4',
          choice: 'none',
          updated_at: '2026-11-06T08:00:00.000Z',
        },
        {
          finding_id: 'securite.hsts',
          choice: 'fix',
          updated_at: '2026-11-05T22:30:00.000Z',
        },
      ]),
    ).toEqual({ 'securite.hsts': 'none' });
  });

  it('ignore les lignes invalides', () => {
    expect(
      savedChoices([
        { finding_id: 'seo.title', choice: 'maybe' },
        { finding_id: 3, choice: 'fix' },
      ]),
    ).toEqual({});
  });
});
