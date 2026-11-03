import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN } from '../src/auth-policy.js';

const toml = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../supabase/config.toml',
  ),
  'utf8',
);

describe('config auth locale', () => {
  it('aligne la longueur minimale sur l’application', () => {
    expect(toml).toContain(`minimum_password_length = ${PASSWORD_MIN}`);
  });

  it('demande une session récente pour changer le mot de passe', () => {
    expect(toml).toContain('secure_password_change = true');
  });
});
