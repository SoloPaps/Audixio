import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr.js';
import { isLinkLimit, linkErrorKey } from './badge-target.js';

const en = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

describe('linkErrorKey', () => {
  it('nomme le plafond d’un lien du plan gratuit', () => {
    expect(linkErrorKey(429, { error: 'user_limit' })).toBe('badge.linkLimit');
  });

  it('garde le message générique pour les autres échecs', () => {
    expect(linkErrorKey(429, { error: 'rate_limited' })).toBe('share.error');
    expect(linkErrorKey(500, { error: 'user_limit' })).toBe('share.error');
    expect(linkErrorKey(404, { error: 'audit_not_found' })).toBe('share.error');
    expect(linkErrorKey(null, null)).toBe('share.error');
  });

  it('le message du plafond ne parle pas des audits du jour', () => {
    expect(fr['badge.linkLimit']).toMatch(/un seul lien actif/);
    expect(fr['badge.linkLimit']).not.toMatch(/audit/i);
    expect(en['badge.linkLimit']).toMatch(/one active link/);
  });
});

describe('isLinkLimit', () => {
  it('reconnaît seulement 429 user_limit', () => {
    expect(isLinkLimit(429, { error: 'user_limit' })).toBe(true);
    expect(isLinkLimit(429, { error: 'rate_limited' })).toBe(false);
    expect(isLinkLimit(403, { error: 'user_limit' })).toBe(false);
    expect(isLinkLimit(429, null)).toBe(false);
  });
});
