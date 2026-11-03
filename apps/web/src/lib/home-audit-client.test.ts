import { describe, expect, it } from 'vitest';
import { t } from './home-audit-copy.js';

describe('textes du lancement accueil', () => {
  it('reprend le délai de 15 minutes sans charger le dictionnaire complet', () => {
    expect(t('api.error.host_limit')).toBe(
      'Ce site a été audité il y a moins de 15 minutes. Réessayez plus tard.',
    );
  });
});
