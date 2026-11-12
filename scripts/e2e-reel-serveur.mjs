/**
 * Serveur du parcours Playwright : Supabase local, labo, build, netlify dev.
 * Refuse toute URL qui n’est pas 127.0.0.1 ou localhost. N’affiche aucun secret.
 */
import { execFileSync, spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCommande } from './commande.mjs';
import { syncWebEnv } from './dev-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kids = [];
let stopping = false;

function redact(text) {
  return text
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jeton]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[jeton]')
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/gi, '$1[mot]@');
}

function pipe(child) {
  child.stdout?.on('data', (chunk) => {
    process.stdout.write(redact(String(chunk)));
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(redact(String(chunk)));
  });
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pipe(child);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} a échoué (${code ?? 'signal'})`));
    });
  });
}

function localHost(raw) {
  const host = new URL(raw).hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

function statusEnv() {
  const env = { ...process.env };
  delete env.SUPABASE_ACCESS_TOKEN;
  delete env.SUPABASE_INTERNAL_ACCESS_TOKEN;
  delete env.SUPABASE_URL;
  delete env.SUPABASE_ANON_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  const text = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  const apiUrl = parsed.API_URL ?? '';
  const anon = parsed.ANON_KEY ?? '';
  const service = parsed.SERVICE_ROLE_KEY ?? '';
  if (!apiUrl || !anon || !service) {
    throw new Error('statut local incomplet');
  }
  if (!localHost(apiUrl)) throw new Error('refus : la base n’est pas locale');
  return { apiUrl, anon, service };
}

async function writeEnv(keys) {
  const file = path.join(root, '.env');
  let existing = '';
  try {
    existing = await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const current = existing.match(/^SUPABASE_URL=(.*)$/m)?.[1] ?? '';
  const bare = current.trim().replace(/^['"]|['"]$/g, '');
  if (bare && !localHost(bare)) {
    throw new Error('refus : .env ne pointe pas en local');
  }
  const body = [
    `SUPABASE_URL=${keys.apiUrl}`,
    `SUPABASE_ANON_KEY=${keys.anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${keys.service}`,
    'AUDIGY_LAB=.netlify/audigy-lab.json',
    '',
  ].join('\n');
  await writeFile(file, body, { mode: 0o600 });
  process.env.SUPABASE_URL = keys.apiUrl;
  process.env.SUPABASE_ANON_KEY = keys.anon;
  process.env.SUPABASE_SERVICE_ROLE_KEY = keys.service;
  process.env.AUDIGY_LAB = '.netlify/audigy-lab.json';
}

async function needsBuild() {
  if (process.env.CI) return true;
  try {
    const stamp = await readFile(
      path.join(root, 'apps/web/dist/.reel-stamp'),
      'utf8',
    );
    await access(path.join(root, 'netlify/dist/functions'));
    return stamp.trim() !== 'local-lab';
  } catch {
    return true;
  }
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const kid of kids) {
    if (!kid.killed) kid.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300).unref();
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

if (!(await portOpen(54321))) {
  await run('supabase', [
    'start',
    '--yes',
    '-x',
    'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ]);
}
await writeEnv(statusEnv());
await syncWebEnv(root);

const lab = spawnCommande('pnpm', ['exec', 'tsx', 'fixtures/lab.ts'], {
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
const labDeadline = Date.now() + 60_000;
while (Date.now() < labDeadline) {
  try {
    await access(labFile);
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
await access(labFile);

if (await needsBuild()) {
  await run('pnpm', ['build']);
  await writeFile(path.join(root, 'apps/web/dist/.reel-stamp'), 'local-lab\n');
}

const netlify = spawn(
  'netlify',
  ['dev', '--offline', '--filter', '@audigy/web'],
  {
    cwd: root,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
kids.push(netlify);
pipe(netlify);
netlify.on('exit', (code) => {
  if (!stopping) shutdown(code === 0 ? 0 : (code ?? 1));
});
