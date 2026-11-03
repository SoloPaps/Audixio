import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('la fonction edge charge @supabase/ssr à la version installée', () => {
  const version = (
    JSON.parse(
      readFileSync('node_modules/@supabase/ssr/package.json', 'utf8'),
    ) as { version: string }
  ).version;
  const source = readFileSync('netlify/edge-functions/auth-guard.ts', 'utf8');
  const types = readFileSync('netlify/edge-functions/npm-ssr.d.ts', 'utf8');
  const specifier = `npm:@supabase/ssr@${version}`;
  expect(source).toContain(`from '${specifier}'`);
  expect(types).toContain(`declare module '${specifier}'`);
});
