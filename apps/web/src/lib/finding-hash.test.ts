import { describe, expect, it } from 'vitest';
import { applyFindingHash, findingHashId } from './finding-hash.js';

describe('B6 — défilement vers le constat ciblé', () => {
  it('lit l’identifiant du hash, y compris avec un point', () => {
    expect(findingHashId('#finding-qualite.liens-0')).toBe(
      'finding-qualite.liens-0',
    );
    expect(findingHashId('#finding-seo.title-0')).toBe('finding-seo.title-0');
    expect(findingHashId('#domaine')).toBeNull();
  });

  it('trouve la carte portant id="finding-…" et la fait défiler', () => {
    const details = { open: false };
    let scrolled = false;
    let seen = '';
    const el = {
      closest: (sel: string) => (sel === 'details' ? details : null),
      scrollIntoView: () => {
        scrolled = true;
      },
    };
    const root = {
      querySelector: (sel: string) => {
        seen = sel;
        return sel === '#finding-qualite\\.liens-0' ? el : null;
      },
    };
    expect(applyFindingHash(root, '#finding-qualite.liens-0')).toBe(true);
    expect(seen).toBe('#finding-qualite\\.liens-0');
    expect(details.open).toBe(true);
    expect(scrolled).toBe(true);
  });

  it('échoue si la carte n’a pas l’id finding- (cas DomainView avant correctif)', () => {
    const root = {
      querySelector: () => null,
    };
    expect(applyFindingHash(root, '#finding-qualite.liens-0')).toBe(false);
  });
});
