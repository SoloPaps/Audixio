import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const IN_SCOPE =
  /^(docs\/|README\.md$|AGENTS\.md$|CONTRIBUTING\.md$|SECURITY\.md$)/;

const tracked = execFileSync('git', ['ls-files', '-z', '*.md'], {
  encoding: 'utf8',
});

const files = tracked
  .split('\0')
  .filter(Boolean)
  .filter((f) => IN_SCOPE.test(f) && !f.startsWith('docs/archive/'));

const LINK_RE = /\]\(([^)\s]+)\)/g;
const PATH_RE =
  /(?<![.\w/])((?:docs|apps|packages|scripts|supabase|netlify|fixtures)\/[A-Za-z0-9_./-]+\.(?:md|ts|mjs|css|svelte|astro|sql|yml|json|svg))\b/g;

describe('documentation : références à jour', () => {
  it('chaque lien Markdown relatif pointe vers un fichier existant', () => {
    const broken: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(LINK_RE)) {
        const raw = m[1] as string;
        if (/^(?:[a-z]+:|#)/i.test(raw) || /[<>{}*]/.test(raw)) continue;
        const target = raw.split('#')[0] as string;
        if (!target) continue;
        const resolved = path.join(path.dirname(file), target);
        if (!existsSync(resolved) && !existsSync(target)) {
          broken.push(`${file} -> ${raw}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('chaque chemin de dépôt cité entre accents graves existe', () => {
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(PATH_RE)) {
        const ref = m[1] as string;
        if (!existsSync(ref)) missing.push(`${file} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
