import { describe, expect, it } from 'vitest';
import { historySince } from './history-since.js';

const at = (iso: string) => ({ at: iso });

describe('historySince', () => {
  it('donne le mois du premier audit, en français', () => {
    expect(
      historySince(
        [at('2026-03-04T10:00:00Z'), at('2025-11-30T23:30:00Z')],
        'fr',
      ),
    ).toBe('décembre 2025');
  });

  it('donne le même mois en anglais', () => {
    expect(historySince([at('2026-03-04T10:00:00Z')], 'en')).toBe('March 2026');
  });

  it('ne rend rien sans audit daté', () => {
    expect(historySince([], 'fr')).toBeNull();
    expect(historySince([at('pas une date')], 'fr')).toBeNull();
  });
});
