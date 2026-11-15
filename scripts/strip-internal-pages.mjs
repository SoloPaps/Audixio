import { access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

/** Pages de recette, retirées du `dist` de production (décision owner). */
export const INTERNAL_PREFIXES = ['dev', path.join('courriel', 'fin-audit')];

async function walk(dir) {
  const found = [];
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...(await walk(full)));
      else found.push(full);
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') return found;
    throw error;
  }
  return found;
}

/** Chemin relatif au `dist`, toujours en « / » (Windows rend des « \\ »). */
export function relativePosix(dist, file, paths = path) {
  return paths.relative(dist, file).split(paths.sep).join('/');
}

function isInternal(normalized) {
  return (
    normalized === 'dev' ||
    normalized.startsWith('dev/') ||
    normalized.startsWith('courriel/fin-audit')
  );
}

export async function listInternalPages(dist) {
  const files = await walk(dist);
  return files
    .map((file) => relativePosix(dist, file))
    .filter((rel) => isInternal(rel))
    .sort();
}

export async function stripInternalPages(dist) {
  await rm(path.join(dist, 'dev'), { recursive: true, force: true });
  const courriel = path.join(dist, 'courriel');
  let entries = [];
  try {
    entries = await readdir(courriel, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('fin-audit')) {
      await rm(path.join(courriel, entry.name), {
        recursive: true,
        force: true,
      });
    }
  }
}

export async function assertInternalPagesAbsent(dist) {
  const leaked = await listInternalPages(dist);
  if (leaked.length > 0) {
    throw new Error(
      `Pages internes présentes dans le build de production : ${leaked.join(', ')}`,
    );
  }
}

export async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}
