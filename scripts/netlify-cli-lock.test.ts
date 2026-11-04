import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Entry = { os?: string[]; cpu?: string[]; optional?: boolean };

const lock = JSON.parse(
  readFileSync(
    new URL('../.github/netlify-cli/package-lock.json', import.meta.url),
    'utf8',
  ),
) as { packages: Record<string, Entry> };
const manifest = JSON.parse(
  readFileSync(
    new URL('../.github/netlify-cli/package.json', import.meta.url),
    'utf8',
  ),
) as { dependencies: Record<string, string> };

describe('lockfile de la Netlify CLI des e2e (npm ci en CI)', () => {
  it('les paquets propres à une plateforme sont optionnels (sinon EBADPLATFORM)', () => {
    const forced = Object.entries(lock.packages)
      .filter(([, e]) => (e.os || e.cpu) && !e.optional)
      .map(([name]) => name);
    expect(forced).toEqual([]);
  });

  it('le lockfile fige la version déclarée', () => {
    const version = manifest.dependencies['netlify-cli'];
    expect(lock.packages['node_modules/netlify-cli']).toMatchObject({
      version,
    });
  });
});
