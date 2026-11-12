import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { SafeResponse } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { REWRITES } from '../apps/web/src/lib/redirects.js';
import { judgeCsp } from '../packages/engine/checks/securite/csp.js';
import { judgeFrames } from '../packages/engine/checks/securite/frames.js';
import { judgeHsts } from '../packages/engine/checks/securite/hsts.js';
import { judgePermissions } from '../packages/engine/checks/securite/permissions.js';
import { judgeReferrerHeader } from '../packages/engine/checks/securite/referrer.js';
import { judgeXcto } from '../packages/engine/checks/securite/xcto.js';
import {
  COMMON_HEADERS,
  contentSecurityPolicy,
  cspHash,
  HOME_MAX_BYTES,
  headersFor,
  hoistIslandStyle,
  inlineHashes,
  localSupabaseOrigin,
  pageWeight,
  parseHeaderFile,
  publish,
  scriptPolicyIsStrict,
  trackerHits,
} from './publish-policy.js';

function response(
  headers: Record<string, string>,
  html = '<!doctype html>',
): SafeResponse {
  const body = new TextEncoder().encode(html);
  return {
    url: 'https://127.0.0.1/',
    status: 200,
    headers: new Headers(headers),
    body,
    transferBytes: body.byteLength,
    ip: '127.0.0.1',
    redirects: [],
    text: () => html,
  };
}

describe('CSP du build', () => {
  it('empreinte un script en ligne et passe la grille sécurité', () => {
    const html =
      '<script type="module">start()</script><style>a{color:red}</style>';
    const hashes = inlineHashes(html);
    expect(hashes.scripts).toEqual([cspHash('start()')]);
    expect(hashes.styles).toEqual([cspHash('a{color:red}')]);
    const policy = contentSecurityPolicy(hashes.scripts, hashes.styles);
    expect(scriptPolicyIsStrict(policy)).toBe(true);
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    for (const directive of policy.split(';')) {
      const name = directive.trim().split(/\s+/u)[0];
      if (name?.startsWith('script-')) {
        expect(directive).not.toContain("'unsafe-inline'");
        expect(directive).not.toContain("'unsafe-eval'");
      }
    }
    const home = response({
      'content-security-policy': policy,
      'strict-transport-security': COMMON_HEADERS['Strict-Transport-Security'],
      'permissions-policy': COMMON_HEADERS['Permissions-Policy'],
      'referrer-policy': COMMON_HEADERS['Referrer-Policy'],
      'x-content-type-options': COMMON_HEADERS['X-Content-Type-Options'],
      'x-frame-options': COMMON_HEADERS['X-Frame-Options'],
    });
    expect(judgeCsp(home).status).toBe('pass');
    expect(judgeFrames(home).status).toBe('pass');
    expect(judgeHsts(home).status).toBe('pass');
    expect(judgePermissions(home).status).toBe('pass');
    expect(judgeReferrerHeader(home).status).toBe('pass');
    expect(judgeXcto(home).status).toBe('pass');
  });

  it('place le style des îles dans head', () => {
    const style =
      '<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>';
    const html = `<!doctype html><html><head><title>T</title></head><body><header>${style}</header></body></html>`;
    const next = hoistIslandStyle(html);
    expect(next.indexOf(style)).toBeLessThan(next.indexOf('</head>'));
    expect(next).not.toContain(`<header>${style}</header>`);
    expect(next.split(style)).toHaveLength(2);
  });

  it('écrit une CSP par page et un plan de site', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-policy-'));
    try {
      await writeFile(
        path.join(dir, 'index.html'),
        '<!doctype html><script>boot()</script>',
        'utf8',
      );
      await publish(dir);
      const rules = parseHeaderFile(
        await readFile(path.join(dir, '_headers'), 'utf8'),
      );
      const headers = headersFor(rules, '/');
      expect(headers['Content-Security-Policy']).toContain(cspHash('boot()'));
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(
        scriptPolicyIsStrict(headers['Content-Security-Policy'] ?? ''),
      ).toBe(true);
      const map = await readFile(path.join(dir, 'sitemap.xml'), 'utf8');
      expect(map).toContain('<loc>/</loc>');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('retest C-Q1 : la CSP suit un Supabase local sur un autre port', async () => {
    expect(localSupabaseOrigin('http://127.0.0.1:55431')).toBe(
      'http://127.0.0.1:55431',
    );
    expect(localSupabaseOrigin('http://localhost:55431/rest/v1')).toBe(
      'http://localhost:55431',
    );
    expect(localSupabaseOrigin('https://abcd.supabase.co')).toBeNull();
    expect(localSupabaseOrigin('https://exemple.fr')).toBeNull();
    expect(localSupabaseOrigin('javascript:alert(1)')).toBeNull();
    expect(localSupabaseOrigin('pas une url')).toBeNull();
    expect(localSupabaseOrigin(undefined)).toBeNull();
    const base = contentSecurityPolicy([], []);
    expect(base).toContain(
      "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321;",
    );
    expect(contentSecurityPolicy([], [], ['http://127.0.0.1:54321'])).toBe(
      base,
    );
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-policy-local-'));
    try {
      await writeFile(
        path.join(dir, 'index.html'),
        '<!doctype html><script>boot()</script>',
        'utf8',
      );
      const policyFor = async (
        env: Record<string, string | undefined>,
      ): Promise<string> => {
        await publish(dir, env);
        const rules = parseHeaderFile(
          await readFile(path.join(dir, '_headers'), 'utf8'),
        );
        return headersFor(rules, '/')['Content-Security-Policy'] ?? '';
      };
      const local = await policyFor({ SUPABASE_URL: 'http://127.0.0.1:55431' });
      expect(local).toContain(
        "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321 http://127.0.0.1:55431;",
      );
      expect(scriptPolicyIsStrict(local)).toBe(true);
      const prod = await policyFor({
        SUPABASE_URL: 'https://abcd.supabase.co',
      });
      expect(prod).not.toContain('55431');
      expect(prod).toContain(
        "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321;",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('compte le poids de l’accueil et refuse un traceur', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-weight-'));
    try {
      await writeFile(
        path.join(dir, 'index.html'),
        '<link rel="stylesheet" href="/a.css">',
        'utf8',
      );
      await writeFile(path.join(dir, 'a.css'), 'body{color:black}', 'utf8');
      const weight = await pageWeight(dir);
      expect(weight.bytes).toBeGreaterThan(0);
      expect(weight.bytes).toBeLessThan(HOME_MAX_BYTES);
      await writeFile(
        path.join(dir, 'extra.js'),
        'https://www.google-analytics.com/g.js',
        'utf8',
      );
      expect(await trackerHits(dir)).toEqual(['extra.js google-analytics.com']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('suit html → css → police avec un seul descripteur par fichier', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-weight-'));
    try {
      const html = '<link rel="stylesheet" href="/a.css">';
      const css = '@font-face{src:url(f.woff2)}';
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      await writeFile(path.join(dir, 'a.css'), css, 'utf8');
      await writeFile(path.join(dir, 'f.woff2'), 'x'.repeat(10), 'utf8');
      const weight = await pageWeight(dir);
      expect(weight.fonts).toBe(10);
      expect(weight.bytes).toBe(html.length + css.length + 10);
      expect(weight.files.map((f) => path.basename(f))).toEqual([
        'index.html',
        'a.css',
        'f.woff2',
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('CSP des adresses réécrites : /rapport/:id/…, imprimer, /partage/:jeton (bug)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-policy-rw-'));
    const page = async (rel: string, code: string): Promise<void> => {
      await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await writeFile(
        path.join(dir, rel),
        `<!doctype html><script>${code}</script>`,
        'utf8',
      );
    };
    try {
      await page('index.html', 'accueil()');
      await page('rapport/index.html', 'resume()');
      for (const tab of [
        'domaines',
        'constats',
        'plan',
        'brief',
        'badge',
        'imprimer',
      ]) {
        await page(`rapport/${tab}/index.html`, `${tab}()`);
      }
      await page('partage/index.html', 'partage()');
      await page('score/index.html', 'score()');
      await page('verifier/index.html', 'verifier()');
      await page(
        'verifier/00000000-0000-4000-8000-000000000019/index.html',
        'preuve()',
      );
      await page('sites/index.html', 'sites()');
      await page('sites/fiche/index.html', 'fiche()');
      await page('sites/id/index.html', 'resoudre()');
      await publish(dir);
      const text = await readFile(path.join(dir, '_headers'), 'utf8');
      const rules = parseHeaderFile(text);
      const csp = (urlPath: string): string =>
        headersFor(rules, urlPath)['Content-Security-Policy'] ?? '';
      const ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
      const cases: [string, string][] = [
        [`/rapport/${ID}`, 'resume()'],
        [`/rapport/${ID}/domaines/seo`, 'domaines()'],
        [`/rapport/${ID}/constats`, 'constats()'],
        [`/rapport/${ID}/plan`, 'plan()'],
        [`/rapport/${ID}/brief`, 'brief()'],
        [`/rapport/${ID}/badge`, 'badge()'],
        [`/rapport/${ID}/imprimer`, 'imprimer()'],
        ['/rapport/', 'resume()'],
        ['/rapport', 'resume()'],
        ['/rapport/domaines/', 'domaines()'],
        ['/partage/jeton-abc', 'partage()'],
        ['/partage/', 'partage()'],
        ['/score/exemple', 'score()'],
        ['/verifier/abc', 'preuve()'],
        ['/verifier/', 'verifier()'],
        ['/sites/exemple.fr', 'fiche()'],
        ['/sites/id/abc', 'resoudre()'],
        ['/sites', 'sites()'],
      ];
      for (const [urlPath, code] of cases) {
        const policy = csp(urlPath);
        expect(policy, urlPath).toContain(cspHash(code));
        expect(scriptPolicyIsStrict(policy), urlPath).toBe(true);
      }
      expect(csp('/')).toContain(cspHash('accueil()'));
      expect(csp('/')).not.toContain(cspHash('resume()'));
      // Une seule politique par famille : aucune règle par page en double.
      const paths = rules
        .filter((rule) => rule.headers['Content-Security-Policy'])
        .map((rule) => rule.path);
      for (const family of [
        '/rapport',
        '/partage',
        '/score',
        '/verifier',
        '/sites',
      ]) {
        expect(paths.filter((item) => item.startsWith(family))).toEqual([
          family,
          `${family}/*`,
        ]);
      }
      // Chaque réécriture 200 (table du rapport et netlify.toml) a sa CSP.
      const toml = await readFile(
        path.join(import.meta.dirname, '..', 'netlify.toml'),
        'utf8',
      );
      const sources = [
        ...REWRITES.map((rule) => rule.from),
        ...[
          ...toml.matchAll(/from = "([^"]+)"\s+to = "[^"]+"\s+status = 200/g),
        ].map((match) => match[1] ?? ''),
      ];
      expect(sources.length).toBeGreaterThan(REWRITES.length);
      for (const from of sources) {
        const sample = from.replace(':id', ID).replace('*', 'x');
        expect(csp(sample), from).toContain("script-src 'self' 'sha256-");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
