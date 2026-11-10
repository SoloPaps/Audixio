import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  bearerToken,
  createLogger,
  handleSitePublic,
  lienDepsFromEnv,
  secretsFromEnv,
} from '@audigy/orchestrator';
import { localFunctionEnv } from './guest-node.js';

function headerValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return '';
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
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = await response.arrayBuffer();
  res.end(Buffer.from(buf));
}

/** Publication /score en recette locale, même handler que la fonction Netlify. */
export async function handleSitesPublicNode(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const env = { ...process.env, ...(localFunctionEnv() ?? {}) };
  const logger = createLogger({ secrets: secretsFromEnv(env) });
  const request = await toRequest(req);
  const response = await handleSitePublic(
    request,
    lienDepsFromEnv({
      env,
      logger,
      accessToken: bearerToken(request),
    }),
  );
  await write(res, response);
}
