import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { dropDevPages } from '../apps/web/drop-dev-pages.mjs';
import { exists } from './strip-internal-pages.mjs';

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('build de production', () => {
  it('retire /dev/composants et /dev/fondations, et garde l’accueil', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'audigy-dev-'));
    dirs.push(root);
    for (const rel of [
      'index.html',
      'dev/composants/index.html',
      'dev/fondations/index.html',
    ]) {
      const full = path.join(root, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, '<html></html>');
    }
    await dropDevPages(root);
    expect(await exists(path.join(root, 'index.html'))).toBe(true);
    expect(await exists(path.join(root, 'dev/composants/index.html'))).toBe(
      false,
    );
    expect(await exists(path.join(root, 'dev/fondations/index.html'))).toBe(
      false,
    );
  });
});
