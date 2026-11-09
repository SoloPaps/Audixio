import { describe, expect, it } from 'vitest';
import { historyFormats } from './history-export.js';

describe('export /historique selon le plan', () => {
  it('compte gratuit (et plan non Pro) : CSV et PDF seulement', () => {
    expect(historyFormats('free')).toEqual(['csv', 'pdf']);
    expect(historyFormats(null)).toEqual(['csv', 'pdf']);
  });

  it('compte Pro : CSV, PDF, Excel et JSON', () => {
    expect(historyFormats('pro')).toEqual(['csv', 'pdf', 'xlsx', 'json']);
  });
});
