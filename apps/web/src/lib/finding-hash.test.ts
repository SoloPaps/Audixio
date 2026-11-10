import { describe, expect, it } from 'vitest';
import { applyFindingHash, findingHashId } from './finding-hash.js';

describe('B6 — défilement vers le constat ciblé', () => {
  it('ouvre le constat du hash et le fait défiler', () => {
    expect(findingHashId('#finding-seo.title-0')).toBe('finding-seo.title-0');
    expect(findingHashId('#domaine')).toBeNull();
    const details = { open: false };
    let scrolled = false;
    const el = {
      closest: (sel: string) => (sel === 'details' ? details : null),
      scrollIntoView: () => {
        scrolled = true;
      },
    };
    const root = {
      querySelector: (sel: string) =>
        sel.includes('finding-seo.title-0') ? el : null,
    };
    expect(applyFindingHash(root, '#finding-seo.title-0')).toBe(true);
    expect(details.open).toBe(true);
    expect(scrolled).toBe(true);
  });
});
