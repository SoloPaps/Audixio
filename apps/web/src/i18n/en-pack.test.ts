import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enPackUsable } from './en-pack.js';

const current = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as unknown;

const magicLink = {
  'login.lead': 'Enter your email. We send a link, with no password.',
  'login.email': 'Email address',
  'login.submit': 'Send the link',
  'footer.privacy': 'Privacy',
};

describe('dictionnaire anglais en cache', () => {
  it('garde le fichier actuel et refuse le lien magique', () => {
    expect(enPackUsable(current)).toBe(true);
    expect(enPackUsable(magicLink)).toBe(false);
    expect(enPackUsable(null)).toBe(false);
    expect(enPackUsable({})).toBe(false);
  });
});
