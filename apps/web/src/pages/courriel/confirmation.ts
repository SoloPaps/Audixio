import type { APIRoute } from 'astro';
import { confirmationPreview } from '../../lib/mail-preview.js';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(confirmationPreview(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex',
    },
  });
