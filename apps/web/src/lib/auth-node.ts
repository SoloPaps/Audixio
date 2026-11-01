import type { IncomingMessage, ServerResponse } from 'node:http';
import { anonymousRedirect } from '@audigy/db/auth-guard';
import { authEnvFrom, handleAuthRequest } from '@audigy/db/auth-http';

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
  if (body)
    return new Request(`${proto}://${host}${req.url ?? '/'}`, {
      method,
      headers,
      body: new Uint8Array(body),
    });
  return new Request(`${proto}://${host}${req.url ?? '/'}`, {
    method,
    headers,
  });
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

/** Branche /api/auth sur le serveur de dev Astro. */
export async function handleAuthNode(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const request = await toRequest(req);
  const response = await handleAuthRequest(request, authEnvFrom(process.env));
  await write(res, response);
}

/** Redirige les pages protégées quand la clé anon n'est pas celle des tests. */
export async function guardAuthNode(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const request = await toRequest(req);
  const env = authEnvFrom(process.env);
  const response = await anonymousRedirect(
    request,
    env ? { url: env.url, anonKey: env.anonKey } : null,
  );
  if (!response) return false;
  await write(res, response);
  return true;
}
