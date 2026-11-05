import { describe, expect, it } from 'vitest';
import { deleteConfirmed } from './delete-confirm.js';

describe('deleteConfirmed', () => {
  it('FR : seul « supprimer » confirme', () => {
    expect(deleteConfirmed('supprimer', 'supprimer')).toBe(true);
    expect(deleteConfirmed('  Supprimer ', 'supprimer')).toBe(true);
    expect(deleteConfirmed('delete', 'supprimer')).toBe(false);
  });

  it('EN : « delete » (mot affiché) ou « supprimer » confirment', () => {
    expect(deleteConfirmed('delete', 'delete')).toBe(true);
    expect(deleteConfirmed('DELETE ', 'delete')).toBe(true);
    expect(deleteConfirmed('supprimer', 'delete')).toBe(true);
  });

  it('refuse le vide, les mots approchés et un mot affiché inattendu', () => {
    for (const typed of [
      '',
      '   ',
      'delet',
      'deletee',
      'oui',
      'yes',
      'supprime',
    ]) {
      expect(deleteConfirmed(typed, 'delete')).toBe(false);
    }
    expect(deleteConfirmed('', '')).toBe(false);
    expect(deleteConfirmed('oui', 'oui')).toBe(false);
  });
});
