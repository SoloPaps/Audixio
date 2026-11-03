import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dépendances', () => {
  it('n’installe pas glob avant 14.0.2', () => {
    const names = readdirSync('node_modules/.pnpm').filter((name) =>
      name.startsWith('glob@'),
    );
    expect(names.some((name) => name.startsWith('glob@14.0.'))).toBe(true);
    expect(
      names.some(
        (name) =>
          /^glob@(?:9|1[0-3])\./.test(name) ||
          name.startsWith('glob@14.0.0') ||
          name.startsWith('glob@14.0.1'),
      ),
    ).toBe(false);
  });
});
