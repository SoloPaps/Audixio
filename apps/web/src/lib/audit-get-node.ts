import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  apiDepsFromEnv,
  apiError,
  createLogger,
  handleGet,
  secretsFromEnv,
} from '@audigy/orchestrator';
import { localFunctionEnv } from './guest-node.js';

function headerValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return '';
}

/** Identifiant d’un `GET /api/audits/:id`. Le brief et les autres verbes passent outre. */
export function auditGetId(path: string, method: string): string | null {
  if (method.toUpperCase() !== 'GET') return null;
  const match = /^\/api\/audits\/([^/]+)\/?$/u.exec(path);
  const id = match?.[1];
  if (!id) return null;
  try {
    return decodeURIComponent(id);
  } catch {
    return null;
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
  const url = `${proto}://${host}${req.url ?? '/'}`;
  return new Request(url, { method: 'GET', headers });
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

/** Branche `GET /api/audits/:id` sur le serveur de dev Astro. */
export async function handleAuditGetNode(
  req: IncomingMessage,
  res: ServerResponse,
  auditId: string,
): Promise<void> {
  const request = await toRequest(req);
  const env = localFunctionEnv();
  if (!env) {
    await write(res, apiError(500, 'internal'));
    return;
  }
  const logger = createLogger({ secrets: secretsFromEnv(env) });
  try {
    const response = await handleGet(
      request,
      apiDepsFromEnv({ env, requestUrl: request.url, logger }),
      auditId,
    );
    await write(res, response);
  } catch {
    await write(res, apiError(500, 'internal'));
  }
}
