import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandOptions, loadRootEnv } from './dev-env.mjs';
import { pruneUnreferenced } from './prune-dist.mjs';
import {
  assertInternalPagesAbsent,
  stripInternalPages,
} from './strip-internal-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = 'apps/web/dist';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, commandOptions());
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} a échoué (${code ?? 'signal'})`,
          ),
        );
    });
  });
}

await loadRootEnv(root);
await run('pnpm', ['--filter', '@audigy/web', 'build']);
await run('node', ['scripts/build-functions.ts']);
await stripInternalPages(dist);
await assertInternalPagesAbsent(dist);

await pruneUnreferenced(dist);
await access(path.join(dist, 'index.html'));
await access(path.join(dist, 'dictionnaire-en.json'));
await access(path.join(dist, 'dictionnaire-fr.json'));
// Anciennes adresses et onglets du rapport (lib/redirects.ts).
await access(path.join(dist, '_redirects'));
await access(path.join(dist, '.well-known', 'audigy-signing-key'));
const preuves = await readdir(path.join(dist, 'preuves'));
if (!preuves.some((name) => name.endsWith('.json'))) {
  throw new Error('dossier de preuve absent du build');
}

await assertInternalPagesAbsent(dist);

await run('pnpm', ['exec', 'tsx', 'scripts/publish-policy.ts']);
