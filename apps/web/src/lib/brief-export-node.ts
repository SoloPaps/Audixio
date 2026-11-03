import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  apiError,
  bearerToken,
  createLogger,
  handleBriefExport,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';
import { briefDeps } from './brief-deps.js';

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

/** Lecture ou envoi de `/api/audits/:id/brief` sur le serveur de dev Astro. */
export async function handleBriefNode(
  req: IncomingMessage,
  res: ServerResponse,
  auditId: string,
): Promise<void> {
  const request = await toRequest(req);
  const read = 'get'.toUpperCase();
  const writeVerb = 'post'.toUpperCase();
  const verb = (req.method ?? read).toUpperCase();
  if (verb !== read && verb !== writeVerb) {
    await write(
      res,
      apiError(
        405,
        'method_not_allowed',
        {},
        { allow: `${read}, ${writeVerb}` },
      ),
    );
    return;
  }
  if (!bearerToken(request)) {
    await write(res, apiError(401, 'unauthorized'));
    return;
  }
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  try {
    const response = await serve(logger, () =>
      handleBriefExport(request, briefDeps(request.url, logger), auditId),
    );
    await write(res, response);
  } catch {
    await write(res, apiError(500, 'internal'));
  }
}
