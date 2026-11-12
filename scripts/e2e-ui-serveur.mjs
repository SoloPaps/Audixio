/**
 * Serveur de `pnpm test:ui` : labo local, puis Astro.
 * Le plafond visiteur reste à 3. Aucun secret n’est écrit.
 */
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCommande } from './commande.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kids = [];
let stopping = false;

function pipe(child) {
  child.stdout?.on('data', (chunk) => {
    process.stdout.write(String(chunk));
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(String(chunk));
  });
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const kid of kids) {
    if (!kid.killed) kid.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 400).unref();
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

const lab = spawnCommande('pnpm', ['exec', 'tsx', 'scripts/e2e-ui-lab.ts'], {
  cwd: root,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
kids.push(lab);
pipe(lab);
lab.on('exit', (code) => {
  if (!stopping) shutdown(code ?? 1);
});

const labFile = path.join(root, '.netlify/audigy-lab.json');
const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  try {
    await access(labFile);
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
await access(labFile);

const astroEnv = {
  ...process.env,
  NETLIFY_DEV: 'true',
  AUDIGY_LAB: labFile,
  ASTRO_TELEMETRY_DISABLED: '1',
  AUDIGY_DEV_TOOLBAR: 'off',
};
delete astroEnv.AUDIGY_GUEST_UNLIMITED;

const astro = spawnCommande(
  'pnpm',
  [
    '--dir',
    'apps/web',
    'exec',
    'astro',
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    process.env.E2E_PORT || '4321',
  ],
  {
    cwd: root,
    env: astroEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
kids.push(astro);
pipe(astro);
astro.on('exit', (code) => {
  if (!stopping) shutdown(code === 0 ? 0 : (code ?? 1));
});
