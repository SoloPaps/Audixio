import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export const A11Y_CHROME_FLAGS =
  '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage';
export const A11Y_ATTEMPTS = 3;

export type A11yAttempt = 'read' | 'retry' | 'fail';

/** Relance si Chrome n’a pas publié son port. Un code 0 passe à la lecture. */
export function a11yAttempt(
  code: number | null,
  attempt: number,
  max = A11Y_ATTEMPTS,
): A11yAttempt {
  if (code === 0) return 'read';
  if (attempt < max) return 'retry';
  return 'fail';
}

/** Dernier chemin absolu, en ignorant le bruit de pnpm. */
export function chromePathFromOutput(text: string): string {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((row) => row.startsWith('/'));
  return lines[lines.length - 1] ?? '';
}

interface LighthouseReport {
  categories?: { accessibility?: { score?: number | null } };
  audits?: Record<string, { id?: string; score?: number | null }>;
}

const port = 4322;
const host = '127.0.0.1';
const pages = [
  `http://${host}:${port}/?theme=light`,
  `http://${host}:${port}/?theme=dark`,
  `http://${host}:${port}/dev/composants?theme=light`,
  `http://${host}:${port}/dev/composants?theme=dark`,
  `http://${host}:${port}/connexion?theme=light`,
  `http://${host}:${port}/connexion?theme=dark`,
  `http://${host}:${port}/sites?theme=light`,
  `http://${host}:${port}/sites?theme=dark`,
  `http://${host}:${port}/verifier?theme=light`,
  `http://${host}:${port}/verifier?theme=dark`,
  `http://${host}:${port}/search-console?theme=light`,
  `http://${host}:${port}/search-console?theme=dark`,
  `http://${host}:${port}/rapport/6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10/imprimer?theme=light`,
  `http://${host}:${port}/rapport/6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10/imprimer?theme=dark`,
  `http://${host}:${port}/verifier/00000000-0000-4000-8000-000000000019/?theme=light`,
  `http://${host}:${port}/verifier/00000000-0000-4000-8000-000000000019/?theme=dark`,
  `http://${host}:${port}/score/exemple-score/?theme=light`,
  `http://${host}:${port}/score/exemple-score/?theme=dark`,
  `http://${host}:${port}/partage/${'ab'.repeat(16)}/?theme=light`,
  `http://${host}:${port}/partage/${'ab'.repeat(16)}/?theme=dark`,
  `http://${host}:${port}/cgu?theme=light`,
  `http://${host}:${port}/cgu?theme=dark`,
  `http://${host}:${port}/confidentialite?theme=light`,
  `http://${host}:${port}/mentions-legales?theme=light`,
  `http://${host}:${port}/accessibilite?theme=light`,
  `http://${host}:${port}/methode?theme=light`,
  `http://${host}:${port}/compte?theme=light`,
  `http://${host}:${port}/compte?theme=dark`,
];

function waitForPort(timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const socket = net.connect(port, host, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`astro dev muet sur le port ${port}`));
        } else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

function playwrightChrome(): string {
  try {
    const out = execFileSync(
      'pnpm',
      [
        '--filter',
        '@audigy/web',
        'exec',
        'node',
        '--input-type=module',
        '-e',
        "import { chromium } from '@playwright/test'; console.log(chromium.executablePath());",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return chromePathFromOutput(out);
  } catch {
    return '';
  }
}

function runLighthouse(
  url: string,
  output: string,
  chromePath: string,
): Promise<number | null> {
  const child = spawn(
    'pnpm',
    [
      'exec',
      'lighthouse',
      url,
      '--only-categories=accessibility',
      '--quiet',
      `--chrome-flags=${A11Y_CHROME_FLAGS}`,
      `--output-path=${output}`,
      '--output=json',
    ],
    {
      stdio: 'inherit',
      env: chromePath
        ? { ...process.env, CHROME_PATH: chromePath }
        : process.env,
    },
  );
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
  });
}

async function main(): Promise<void> {
  const server = spawn(
    'pnpm',
    [
      '--filter',
      '@audigy/web',
      'exec',
      'astro',
      'dev',
      '--host',
      host,
      '--port',
      String(port),
    ],
    {
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    },
  );

  try {
    await waitForPort(120_000);
    await delay(300);
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-lh-'));
    const chromePath = playwrightChrome();
    const failures: string[] = [];
    for (const [index, url] of pages.entries()) {
      const output = path.join(dir, `${index}.json`);
      let code: number | null = 1;
      for (let attempt = 1; attempt <= A11Y_ATTEMPTS; attempt += 1) {
        code = await runLighthouse(url, output, chromePath);
        const next = a11yAttempt(code, attempt);
        if (next === 'retry') {
          await delay(1500);
          continue;
        }
        break;
      }
      if (code !== 0) {
        failures.push(`${url} lighthouse a quitté ${code}`);
        continue;
      }
      let report: LighthouseReport;
      try {
        report = JSON.parse(await readFile(output, 'utf8')) as LighthouseReport;
      } catch {
        failures.push(`${url} rapport illisible`);
        continue;
      }
      const score = report.categories?.accessibility?.score;
      if (score !== 1) {
        const audits = Object.values(report.audits ?? {})
          .filter((audit) => typeof audit.score === 'number' && audit.score < 1)
          .map((audit) => audit.id);
        failures.push(`${url} score ${score} : ${audits.join(', ')}`);
      }
    }
    await rm(dir, { recursive: true, force: true });
    if (failures.length > 0) {
      throw new Error(failures.join('\n'));
    }
  } finally {
    if (server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        server.kill('SIGTERM');
      }
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
