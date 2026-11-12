import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import { supabaseTests } from './scripts/tests-supabase.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
// Sans Supabase local (poste Windows, job CI windows) : AUDIGY_SANS_SUPABASE=1
// écarte les tests de base locale. Sans ce réglage, ils tournent et échouent
// tout de suite avec « lancez supabase start » si la base manque.
const sansSupabase =
  process.env.AUDIGY_SANS_SUPABASE === '1' ? supabaseTests(root) : [];

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'scripts/**/*.test.ts',
      'apps/web/src/i18n/**/*.test.ts',
      'apps/web/src/lib/**/*.test.ts',
      'packages/**/*.test.ts',
    ],
    exclude: [...configDefaults.exclude, ...sansSupabase],
    testTimeout: 30_000,
    hookTimeout: 300_000,
  },
});
