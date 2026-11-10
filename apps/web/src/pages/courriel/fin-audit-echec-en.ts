import type { APIRoute } from 'astro';
import { auditEndPreview } from '../../lib/mail-preview.js';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(auditEndPreview('failed', 'en', 'down'), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex',
    },
  });
