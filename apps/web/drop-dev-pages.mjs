import { rm } from 'node:fs/promises';
import path from 'node:path';

/** Retire /dev du dist. Le banc reste servi par astro dev. */
export async function dropDevPages(dist) {
  await rm(path.join(dist, 'dev'), { recursive: true, force: true });
}
