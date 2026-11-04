import { describe, expect, it } from 'vitest';
import { briefScreen } from './brief-screen.js';

const item = {
  checkId: 'seo.canonical',
  title: 'Adresse canonique',
  proof: 'pointe vers autre.example',
  mode: 'fix' as const,
};

describe('briefScreen (bug #18)', () => {
  it('ne dit pas « Site non vérifié » pour un site vérifié', () => {
    const text = briefScreen({
      url: 'https://gratuit.audigy.test',
      items: [item],
      verified: true,
    });
    expect(text).not.toContain('non vérifié');
  });
  it('garde le brief partiel pour un site non vérifié', () => {
    const text = briefScreen({
      url: 'https://gratuit.audigy.test',
      items: [item],
      verified: false,
    });
    expect(text).toContain('PARTIEL');
  });
});
