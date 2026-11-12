import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertInternalPagesAbsent,
  exists,
  listInternalPages,
  relativePosix,
  stripInternalPages,
} from './strip-internal-pages.mjs';

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('pages internes retirées du build de production', () => {
  it('ferme /dev/composants et /courriel/fin-audit-* tout en gardant les autres courriels', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'audigy-strip-'));
    dirs.push(root);
    const files = [
      'index.html',
      'dev/composants/index.html',
      'courriel/confirmation',
      'courriel/recap',
      'courriel/recap-stable',
      'courriel/fin-audit-pret-fr',
      'courriel/fin-audit-pret-en',
      'courriel/fin-audit-echec-fr',
      'courriel/fin-audit-echec-en.html',
    ];
    for (const rel of files) {
      const full = path.join(root, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, '<html></html>');
    }

    expect(await listInternalPages(root)).toEqual([
      'courriel/fin-audit-echec-en.html',
      'courriel/fin-audit-echec-fr',
      'courriel/fin-audit-pret-en',
      'courriel/fin-audit-pret-fr',
      'dev/composants/index.html',
    ]);

    await stripInternalPages(root);
    await assertInternalPagesAbsent(root);

    expect(await exists(path.join(root, 'index.html'))).toBe(true);
    expect(await exists(path.join(root, 'courriel/confirmation'))).toBe(true);
    expect(await exists(path.join(root, 'courriel/recap'))).toBe(true);
    expect(await exists(path.join(root, 'courriel/recap-stable'))).toBe(true);
    expect(await exists(path.join(root, 'dev/composants/index.html'))).toBe(
      false,
    );
    expect(await exists(path.join(root, 'courriel/fin-audit-pret-fr'))).toBe(
      false,
    );
    expect(
      await exists(path.join(root, 'courriel/fin-audit-echec-en.html')),
    ).toBe(false);
  });
  it('rend des chemins en « / » même sous Windows', () => {
    expect(
      relativePosix(
        'C:\\Projets\\Audixio\\dist',
        'C:\\Projets\\Audixio\\dist\\courriel\\fin-audit-echec-en.html',
        path.win32,
      ),
    ).toBe('courriel/fin-audit-echec-en.html');
  });
});
