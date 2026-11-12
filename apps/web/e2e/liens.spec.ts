import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

const PAGES = join(import.meta.dirname, '../src/pages');

function routesFrom(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('[') || name === 'api') {
      continue;
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...routesFrom(full));
      continue;
    }
    if (!name.endsWith('.astro') || name.startsWith('[')) continue;
    const rel = relative(PAGES, full).replaceAll('\\', '/');
    const route = `/${rel.replace(/\.astro$/u, '')}`.replace(/\/index$/u, '');
    found.push(route === '' ? '/' : route);
  }
  return found;
}

function skipHref(raw: string): boolean {
  return (
    raw === '' ||
    (raw.startsWith('#') && raw.length === 1) ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('javascript:') ||
    raw.startsWith('data:') ||
    raw.startsWith('/api') ||
    raw.startsWith('/_')
  );
}

test('aucun lien interne mort ni ancre absente', async ({ request }) => {
  const queue = routesFrom(PAGES);
  const seen = new Set<string>();
  const htmlOf = new Map<string, string>();
  const failures: string[] = [];

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const response = await request.get(path);
    const status = response.status();
    const known =
      (path === '/404' && status === 404) ||
      (path === '/500' && status === 500);
    if (status >= 400 && !known) {
      failures.push(`${path} → ${status}`);
      continue;
    }
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('html')) continue;
    const html = await response.text();
    htmlOf.set(path, html);
    for (const match of html.matchAll(/\shref="([^"]*)"/gu)) {
      const raw = match[1] ?? '';
      if (
        skipHref(raw) ||
        raw.startsWith('http:') ||
        raw.startsWith('https:') ||
        raw.startsWith('//')
      ) {
        continue;
      }
      let url: URL;
      try {
        url = new URL(raw, `${ORIGIN}${path}`);
      } catch {
        failures.push(`${path} href illisible ${raw}`);
        continue;
      }
      if (url.origin !== ORIGIN) continue;
      if (!seen.has(url.pathname) && !queue.includes(url.pathname)) {
        queue.push(url.pathname);
      }
    }
  }

  for (const [path, html] of htmlOf) {
    const ids = new Set(
      [...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1] ?? ''),
    );
    for (const match of html.matchAll(/\shref="([^"]*)"/gu)) {
      const raw = match[1] ?? '';
      if (
        skipHref(raw) ||
        raw.startsWith('http:') ||
        raw.startsWith('https:') ||
        raw.startsWith('//')
      ) {
        continue;
      }
      let url: URL;
      try {
        url = new URL(raw, `${ORIGIN}${path}`);
      } catch {
        continue;
      }
      if (url.origin !== ORIGIN) continue;
      const hash = decodeURIComponent(url.hash.slice(1));
      if (!hash) continue;
      const target = htmlOf.get(url.pathname);
      if (!target) {
        failures.push(`${path} → ${raw} (page absente)`);
        continue;
      }
      const targetIds =
        url.pathname === path
          ? ids
          : new Set(
              [...target.matchAll(/\sid="([^"]+)"/gu)].map(
                (item) => item[1] ?? '',
              ),
            );
      if (!targetIds.has(hash)) {
        failures.push(`${path} → ${raw}`);
      }
    }
  }

  expect(failures, failures.join('\n')).toEqual([]);

  const methode = htmlOf.get('/methode') ?? '';
  for (const id of [
    'method-never',
    'method-observatory',
    'method-lighthouse',
    'method-ecoindex',
    'method-trackers',
    'method-doh',
  ]) {
    expect(methode, id).toContain(`id="${id}"`);
  }
  for (const path of [
    '/rapport/badge',
    '/compte',
    '/compte/alertes',
    '/historique',
    '/sites',
  ]) {
    expect(htmlOf.get(path) ?? '', path).toContain('id="contenu"');
  }
  expect(htmlOf.get('/compte') ?? '').toContain('id="contact"');
});
