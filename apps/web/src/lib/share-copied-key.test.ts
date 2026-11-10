import { describe, expect, it } from 'vitest';
import { shareCopiedKey } from './account-access.js';

describe('B3 — toast de copie selon le type de lien', () => {
  it('distingue le lien public du lien équipe', () => {
    expect(shareCopiedKey('team')).toBe('mq.co.078');
    expect(shareCopiedKey('public')).toBe('mq.co.078.public');
  });
});
