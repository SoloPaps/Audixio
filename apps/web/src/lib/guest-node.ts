import { execFileSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  apiDepsFromEnv,
  apiError,
  createLogger,
  handleGuestCreate,
  secretsFromEnv,
} from '@audigy/orchestrator';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

function headerValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return '';
}

function isLocal(raw: string): boolean {
  try {
    const host = new URL(raw).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const proto = headerValue(req.headers['x-forwarded-proto']) || 'http';
  const host = headerValue(req.headers.host) || '127.0.0.1:4321';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const line = headerValue(value);
    if (line) headers.set(key, line);
  }
  let body: Buffer | undefined;
  const verb = (req.method ?? 'get').toLowerCase();
  if (verb !== 'get' && verb !== 'head') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }
  const method = req.method ?? 'GET';
  const url = `${proto}://${host}${req.url ?? '/'}`;
  if (body) {
    return new Request(url, { method, headers, body: new Uint8Array(body) });
  }
  return new Request(url, { method, headers });
}

async function write(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader('set-cookie', cookies);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    res.setHeader(key, value);
  });
  const buf = await response.arrayBuffer();
  res.end(Buffer.from(buf));
}

function statusEnv(): NodeJS.ProcessEnv | null {
  const configured = process.env.SUPABASE_URL ?? '';
  if (configured && !isLocal(configured)) return null;
  const cliEnv = { ...process.env };
  delete cliEnv.SUPABASE_ACCESS_TOKEN;
  delete cliEnv.SUPABASE_INTERNAL_ACCESS_TOKEN;
  delete cliEnv.SUPABASE_URL;
  delete cliEnv.SUPABASE_ANON_KEY;
  delete cliEnv.SUPABASE_SERVICE_ROLE_KEY;
  let text = '';
  try {
    text = execFileSync('supabase', ['status', '-o', 'env'], {
      cwd: root,
      env: cliEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
  const parsed: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) parsed[match[1]] = match[2];
  }
  const apiUrl = parsed.API_URL ?? '';
  const anon = parsed.ANON_KEY ?? '';
  const service = parsed.SERVICE_ROLE_KEY ?? '';
  if (!apiUrl || !anon || !service || !isLocal(apiUrl)) return null;
  return {
    ...process.env,
    SUPABASE_URL: apiUrl,
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
  };
}

/** Branche POST /api/guest-audits sur le serveur de dev Astro. */
export async function handleGuestNode(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const request = await toRequest(req);
  const env = statusEnv();
  if (!env) {
    await write(res, apiError(500, 'internal'));
    return;
  }
  const logger = createLogger({ secrets: secretsFromEnv(env) });
  try {
    const response = await handleGuestCreate(
      request,
      apiDepsFromEnv({ env, requestUrl: request.url, logger }),
    );
    await write(res, response);
  } catch {
    await write(res, apiError(500, 'internal'));
  }
}
