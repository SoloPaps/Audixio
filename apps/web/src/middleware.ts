import { defineMiddleware } from 'astro:middleware';
import { maquetteDocument, type MaquetteId } from './lib/maquette-html';

function documentFor(url: URL): MaquetteId | null {
  const visuel = url.searchParams.get('visuel');
  if (url.pathname === '/rapport' && visuel === '1') return 'hub';
  if (url.pathname === '/domaine' && visuel === 'ouvert') return 'domaine';
  if (url.pathname === '/domaine' && visuel === 'restreint') return 'restreint';
  if (url.pathname === '/verifier' && visuel === '1') return 'preuve';
  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const id = documentFor(new URL(context.request.url));
  if (!id) return next();
  return new Response(maquetteDocument(id), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});
