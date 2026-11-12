import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Un fichier de test qui exige le Supabase local (base, API, Mailpit). */
export const NEEDS_SUPABASE =
  /\bawait ensureLocalSupabase\(\)|\blocalSupabaseStatus\(\)/u;

const SKIP = new Set(['node_modules', '.git', 'dist', 'data']);

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

/**
 * Tests à écarter quand Supabase local n’est pas lancé, en chemins relatifs
 * « / » (motifs Vitest). Seulement sur demande : AUDIGY_SANS_SUPABASE=1.
 */
export function supabaseTests(
  root,
  dirs = ['scripts', 'apps/web/src', 'packages'],
) {
  return dirs
    .flatMap((dir) => walk(path.join(root, dir), []))
    .filter((file) => NEEDS_SUPABASE.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}
