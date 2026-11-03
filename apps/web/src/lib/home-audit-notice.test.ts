import { describe, expect, it } from 'vitest';
import { homeFormAlert } from './home-audit-notice.js';

const URL_ERROR = 'Indiquez une adresse complète, comme https://exemple.fr.';
const HOST_LIMIT =
  'Ce site a été audité il y a moins de 15 minutes. Réessayez plus tard.';

describe('alerte du lancement depuis l’accueil', () => {
  it('affiche le délai de 15 minutes renvoyé par l’API', () => {
    expect(
      homeFormAlert({
        invalidUrl: true,
        apiMessage: HOST_LIMIT,
        urlError: URL_ERROR,
      }),
    ).toBe(HOST_LIMIT);
  });

  it('garde l’erreur d’adresse quand l’API n’a rien dit', () => {
    expect(
      homeFormAlert({
        invalidUrl: true,
        apiMessage: '',
        urlError: URL_ERROR,
      }),
    ).toBe(URL_ERROR);
  });

  it('reste vide tant que l’adresse et l’API sont valides', () => {
    expect(
      homeFormAlert({
        invalidUrl: false,
        apiMessage: '',
        urlError: URL_ERROR,
      }),
    ).toBe('');
  });
});
