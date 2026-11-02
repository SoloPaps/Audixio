import { describe, expect, it } from 'vitest';
import { fr } from './fr.js';
import { type SlimKey, slim } from './slim.js';

describe('dictionnaire allégé', () => {
  it('reproduit les chaînes du dictionnaire français', () => {
    for (const key of Object.keys(slim) as SlimKey[]) {
      expect(slim[key], key).toBe(fr[key]);
    }
  });
});
