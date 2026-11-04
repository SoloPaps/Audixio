import { describe, expect, it } from 'vitest';
import { mesureDomaine, parseApercu } from './apercu.js';

const carte = {
  score_global: 72,
  note_globale: 'C',
  site_verifie: true,
  domaines: [
    { domaine: 'performance', verrouille: false, note: 'C', score: 72 },
    { domaine: 'ecologie', verrouille: false, note: 'C', score: 72 },
    { domaine: 'securite', verrouille: false, note: 'C', score: 72 },
  ],
};

describe('aperçu du rapport', () => {
  it('ignore une charge qui n’est pas un objet', () => {
    expect(parseApercu(null)).toBeNull();
    expect(parseApercu([])).toBeNull();
  });

  it('garde la note globale et les domaines mesurés', () => {
    const parsed = parseApercu(carte);
    expect(parsed?.score).toBe(72);
    expect(parsed?.grade).toBe('C');
    expect(parsed?.verified).toBe(true);
    expect(mesureDomaine(parsed, 'performance')).toEqual({
      score: 72,
      note: 'C',
      locked: false,
    });
  });

  it('masque le chiffre d’un domaine verrouillé', () => {
    const parsed = parseApercu({
      score_global: null,
      note_globale: null,
      site_verifie: false,
      domaines: [
        {
          domaine: 'securite',
          verrouille: true,
          note: null,
          score: null,
        },
      ],
    });
    expect(mesureDomaine(parsed, 'securite')).toEqual({
      score: null,
      note: null,
      locked: true,
    });
    expect(mesureDomaine(parsed, 'performance').score).toBeNull();
  });
});
