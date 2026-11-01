import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('étiquettes GitHub', () => {
  it('valide .github/labels.yml', () => {
    const out = execFileSync(
      'node',
      ['.github/scripts/sync-labels.mjs', '--check'],
      {
        encoding: 'utf8',
      },
    );
    expect(out).toContain('8 étiquettes valides');
  });
});
