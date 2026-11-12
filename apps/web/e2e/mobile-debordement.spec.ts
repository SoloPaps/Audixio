import { mkdirSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { ORIGIN } from './origin.js';

/**
 * Débordement horizontal mobile.
 * Ne charge aucune maquette : uniquement l’application servie.
 */

const WIDTHS = [320, 330, 360, 375, 390, 414] as const;
const AUDIT_ID = '00000000-0000-4000-8000-0000000000aa';
const SITE_ID = '00000000-0000-4000-8000-0000000000bb';
const LONG_HOST = 'boutique-internationale.atelier-martin-artisan.exemple.fr';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Ada' },
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

type Plan = 'free' | 'pro';
type SitesMode = 'empty' | 'list' | 'live';

type Scene = {
  id: string;
  path: string;
  plan?: Plan;
  sites?: SitesMode;
  audit?: 'guest' | 'verified' | 'partial' | 'running' | 'done';
  wait?: string;
  menu?: boolean;
  action?:
    | 'notify'
    | 'progress-ready'
    | 'share'
    | 'guest-gate'
    | 'delete-dialog'
    | 'pro-modal';
};

const GUEST_PATHS = [
  '/',
  '/methode',
  '/pro',
  '/connexion',
  '/inscription',
  '/reinitialisation',
  '/email-confirme',
  '/bienvenue',
  '/mentions-legales',
  '/cgu',
  '/confidentialite',
  '/accessibilite',
  '/cookies',
  '/robot',
  '/404',
  '/500',
  '/maintenance',
  '/audit-echoue',
  '/passer-pro',
  '/demande-acces',
  '/ecoconception',
  '/verifier',
  '/partage',
  '/score',
  '/dev/composants',
  '/exemple-rapport',
  '/sites/exemple.fr/demandes/req_948f2a1b7e',
  '/verifier/00000000-0000-4000-8000-000000000019',
  '/rapport/imprimer',
  '/courriel/confirmation',
  '/courriel/recap',
  '/courriel/recap-stable',
  '/rapport',
  '/brief',
  '/plan',
  '/constat',
  '/domaine',
  '/badge',
  '/progression',
];

function finding(partial: {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  impact: number;
  messageKey: string;
  reason?: string;
}): unknown {
  return {
    domain: partial.domain,
    checkId: partial.checkId,
    status: partial.status,
    severity: partial.severity,
    impact: partial.impact,
    score: partial.status === 'pass' ? 90 : 40,
    measured: null,
    messageKey: partial.messageKey,
    params: null,
    fixKey: null,
    effortMinutes: 20,
    reason: partial.reason ?? null,
  };
}

function auditPayload(kind: NonNullable<Scene['audit']>): unknown {
  const verified = kind === 'verified' || kind === 'done';
  const running = kind === 'running';
  const locked = !verified && !running;
  const domains = [
    ['performance', 58],
    ['seo', 78],
    ['securite', locked ? null : 62],
    ['ecologie', 60],
    ['accessibilite', 81],
    ['qualite', 84],
    ['vie_privee', locked ? null : 70],
    ['dns_email', locked ? null : 95],
  ] as const;
  return {
    audit: {
      id: AUDIT_ID,
      status: running ? 'running' : kind === 'done' ? 'done' : 'partial',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: locked ? null : 74,
      siteVerified: verified,
      partialLabel: locked ? 'partielle · 5 domaines · site non vérifié' : null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: running ? null : '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: SITE_ID,
        url: `https://${LONG_HOST}/catalogue/printemps-ete-collection-limitee`,
        label: LONG_HOST,
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: domains.map(([domain, score]) => ({
      domain,
      score,
      coverage: 1,
      level: score === null ? 'untested' : 'improve',
      locked:
        locked &&
        (domain === 'securite' ||
          domain === 'vie_privee' ||
          domain === 'dns_email'),
    })),
    findings: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
      finding({
        domain: n <= 2 ? 'performance' : n <= 5 ? 'seo' : 'qualite',
        checkId: n === 1 ? 'px.1' : `px.${n}`,
        status: n <= 3 ? 'fail' : n <= 7 ? 'warn' : 'pass',
        severity: n <= 3 ? 4 : 2,
        impact: 3,
        messageKey: `hub.px.t${n}`,
        reason: `hub.px.t${n}`,
      }),
    ),
  };
}

function scenes(): Scene[] {
  const list: Scene[] = GUEST_PATHS.map((path) => ({
    id: `invité ${path}`,
    path,
    menu: true,
  }));
  list.push(
    {
      id: 'invité rapport long',
      path: `/rapport?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité domaine perf',
      path: `/domaine?id=${AUDIT_ID}&domaine=performance`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité domaine verrouillé',
      path: `/domaine?id=${AUDIT_ID}&domaine=securite`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité constat',
      path: `/constat?id=${AUDIT_ID}&check=px.1`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité plan',
      path: `/plan?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité brief',
      path: `/brief?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité badge',
      path: `/badge?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'invité partage feuille',
      path: `/rapport?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: '#shareBtn',
      action: 'share',
    },
    {
      id: 'invité fenêtre domaine',
      path: `/rapport?id=${AUDIT_ID}`,
      audit: 'guest',
      wait: '#domaine-securite',
      action: 'guest-gate',
    },
    {
      id: 'invité impression',
      path: `/rapport/${AUDIT_ID}/imprimer`,
      audit: 'guest',
      wait: 'a.btn',
    },
    {
      id: 'progression en cours',
      path: '/progression',
      menu: true,
    },
    {
      id: 'progression prête',
      path: '/progression',
      action: 'progress-ready',
      menu: true,
    },
    {
      id: 'progression connectée en cours',
      path: `/progression?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'running',
      wait: '#liveT',
    },
    {
      id: 'progression connectée prête',
      path: `/progression?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'done',
      wait: '#liveT',
      action: 'progress-ready',
    },
    {
      id: 'progression prévient',
      path: '/progression?maquette=1',
      action: 'notify',
    },
    {
      id: 'connecté gratuit rapport',
      path: `/rapport?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'connecté gratuit rapport partiel',
      path: `/rapport?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'partial',
      wait: 'h1',
      menu: true,
    },
    {
      id: 'connecté gratuit brief',
      path: `/brief?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit domaine',
      path: `/domaine?id=${AUDIT_ID}&domaine=performance`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit plan',
      path: `/plan?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit constat',
      path: `/constat?id=${AUDIT_ID}&check=px.1`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit badge',
      path: `/badge?id=${AUDIT_ID}`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit impression',
      path: `/rapport/${AUDIT_ID}/imprimer`,
      plan: 'free',
      audit: 'verified',
      wait: 'h1',
    },
    {
      id: 'connecté gratuit sites vides',
      path: '/sites',
      plan: 'free',
      sites: 'empty',
      wait: '[data-mode="empty"]',
      menu: true,
    },
    {
      id: 'connecté gratuit sites',
      path: '/sites',
      plan: 'free',
      sites: 'list',
      wait: '[data-mode="list"]',
      menu: true,
    },
    {
      id: 'connecté gratuit modale pro',
      path: '/sites',
      plan: 'free',
      sites: 'list',
      wait: '[data-pro]',
      action: 'pro-modal',
    },
    {
      id: 'connecté pro sites',
      path: '/sites',
      plan: 'pro',
      sites: 'list',
      wait: '[data-mode="list"]',
      menu: true,
    },
    {
      id: 'connecté gratuit compte',
      path: '/compte',
      plan: 'free',
      wait: '[data-mode="ready"]',
      menu: true,
    },
    {
      id: 'connecté pro compte',
      path: '/compte',
      plan: 'pro',
      wait: '[data-mode="ready"]',
      menu: true,
    },
    {
      id: 'connecté gratuit suppression',
      path: '/compte',
      plan: 'free',
      wait: '#del',
      action: 'delete-dialog',
    },
    {
      id: 'connecté gratuit historique',
      path: '/historique',
      plan: 'free',
      wait: '[data-mode="ready"]',
      menu: true,
    },
    {
      id: 'connecté pro historique',
      path: '/historique',
      plan: 'pro',
      wait: '[data-mode="ready"]',
      menu: true,
    },
    {
      id: 'connecté gratuit alertes',
      path: '/compte/alertes',
      plan: 'free',
      wait: '[data-mode="ready"]',
      menu: true,
    },
    {
      id: 'connecté pro alertes',
      path: `/compte/alertes?site=${SITE_ID}`,
      plan: 'pro',
      wait: '#gate:not(.locked)',
      menu: true,
    },
    {
      id: 'connecté gratuit accueil',
      path: '/',
      plan: 'free',
      menu: true,
    },
    {
      id: 'connecté pro accueil',
      path: '/',
      plan: 'pro',
      menu: true,
    },
  );
  return list;
}

async function install(page: Page, scene: Scene): Promise<void> {
  const plan = scene.plan;
  await page.route('**/api/auth/session', async (route) => {
    if (!plan) {
      await route.fulfill({ status: 401, body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        user: session.user,
      }),
    });
  });
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });
  if (scene.audit && scene.audit !== 'guest') {
    await page.route('**/api/audits/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(auditPayload(scene.audit ?? 'verified')),
      });
    });
  }
  if (plan) {
    const sites =
      scene.sites === 'empty'
        ? []
        : scene.sites === 'live'
          ? [
              {
                id: SITE_ID,
                url: `https://${LONG_HOST}`,
                label: LONG_HOST,
                host: LONG_HOST,
                owner_id: USER_ID,
                is_public: false,
                public_slug: null,
                expose_security: false,
              },
            ]
          : [
              {
                id: SITE_ID,
                url: 'https://monsite-exemple.fr',
                label: 'monsite-exemple.fr',
                host: 'monsite-exemple.fr',
                owner_id: USER_ID,
                is_public: true,
                public_slug: 'exemple',
                expose_security: false,
              },
              {
                id: '00000000-0000-4000-8000-0000000000cc',
                url: 'https://boutique.exemple.fr',
                label: 'boutique.exemple.fr',
                host: 'boutique.exemple.fr',
                owner_id: USER_ID,
                is_public: false,
                public_slug: null,
                expose_security: false,
              },
            ];
    await page.route('http://127.0.0.1:54321/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }
      const url = route.request().url();
      if (url.includes('/rest/v1/profiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ plan }),
        });
        return;
      }
      if (url.includes('/rest/v1/sites')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(scene.sites ? sites : []),
        });
        return;
      }
      if (url.includes('ensure_alert_settings')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            plan === 'pro'
              ? {
                  reaudit_cadence: 'weekly',
                  score_drop_points: 5,
                  ssl_warn_days: 14,
                }
              : {
                  reaudit_cadence: 'monthly',
                  score_drop_points: 0,
                  ssl_warn_days: 14,
                },
          ),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: url.includes('/rpc/') ? 'null' : '[]',
      });
    });
    await page.addInitScript(
      (stored) => {
        const view = globalThis as unknown as {
          localStorage: { setItem: (key: string, value: string) => void };
        };
        view.localStorage.setItem('audigy-auth', JSON.stringify(stored));
      },
      {
        access_token: session.access_token,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
        token_type: session.token_type,
        user: session.user,
      },
    );
    await page.context().addCookies([
      {
        name: 'audixio_connecte',
        value: '1',
        url: ORIGIN,
      },
    ]);
  }
  if (scene.audit === 'guest') {
    await page.addInitScript(
      ([key, value]) => {
        const view = globalThis as unknown as {
          sessionStorage: { setItem: (name: string, data: string) => void };
        };
        view.sessionStorage.setItem(key, value);
      },
      ['audixio-guest-audit', JSON.stringify(auditPayload('partial'))] as const,
    );
  }
}

async function openState(page: Page, scene: Scene): Promise<void> {
  if (scene.action === 'notify') {
    await page.locator('#notifyBtn').click();
    await expect(page.locator('#notify')).toHaveJSProperty('open', true);
  }
  if (scene.action === 'progress-ready') {
    await page.evaluate(() => {
      const view = globalThis as unknown as {
        audixioProgress?: { finish: () => void };
        document: { body: { classList: { add: (name: string) => void } } };
      };
      view.audixioProgress?.finish();
      view.document.body.classList.add('done');
    });
  }
  if (scene.action === 'share') {
    await page.locator('#shareBtn').click();
    await expect(page.locator('.sh-dlg')).toBeVisible();
  }
  if (scene.action === 'guest-gate') {
    await page.locator('#domaine-securite').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  if (scene.action === 'delete-dialog') {
    await page.locator('#del').click();
    await expect(page.locator('#dlg')).toHaveJSProperty('open', true);
  }
  if (scene.action === 'pro-modal') {
    await page.locator('[data-pro]').first().click();
    await expect(page.locator('#pro-modal')).toBeVisible();
  }
}

async function collect(
  page: Page,
  width: number,
  state: string,
): Promise<string[]> {
  return page.evaluate(
    ({ width: viewWidth, state: label }) => {
      // Esbuild nomme les fonctions imbriquées via __name, absent de la page.
      (globalThis as { __name?: (target: unknown) => unknown }).__name ??= (
        target,
      ) => target;
      type El = {
        nodeType: number;
        tagName: string;
        id: string;
        className: string;
        textContent: string | null;
        children: ArrayLike<El>;
        parentElement: El | null;
        closest: (selector: string) => El | null;
        contains: (node: El) => boolean;
        getBoundingClientRect: () => {
          left: number;
          right: number;
          top: number;
          bottom: number;
          width: number;
          height: number;
        };
        scrollWidth: number;
        clientWidth: number;
        querySelectorAll: (selector: string) => Iterable<El>;
      };
      type Style = {
        display: string;
        visibility: string;
        opacity: string;
        overflowX: string;
        textOverflow: string;
        whiteSpace: string;
        position: string;
      };
      const view = globalThis as unknown as {
        document: {
          documentElement: El & { scrollWidth: number; clientWidth: number };
          scrollingElement:
            | (El & { scrollWidth: number; clientWidth: number })
            | null;
          body: El & { scrollWidth: number };
          querySelectorAll: (selector: string) => Iterable<El>;
        };
        getComputedStyle: (el: El) => Style;
        innerWidth: number;
      };
      const doc = view.document;
      const vw = Math.min(view.innerWidth, doc.documentElement.clientWidth);
      const tol = 2;
      const issues: string[] = [];

      function hidden(el: El): boolean {
        if (el.closest('[hidden]')) return true;
        let node: El | null = el;
        while (node) {
          const style = view.getComputedStyle(node);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.visibility === 'collapse' ||
            style.opacity === '0'
          ) {
            return true;
          }
          node = node.parentElement;
        }
        return false;
      }

      function labelOf(el: El): string {
        const parts: string[] = [];
        let node: El | null = el;
        while (node && node.nodeType === 1 && parts.length < 4) {
          let bit = node.tagName.toLowerCase();
          if (node.id) {
            parts.unshift(`${bit}#${node.id}`);
            break;
          }
          if (typeof node.className === 'string' && node.className.trim()) {
            const classes = node.className.trim().split(/\s+/).slice(0, 2);
            bit += `.${classes.join('.')}`;
          }
          parts.unshift(bit);
          node = node.parentElement;
        }
        const text = (el.textContent || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 72);
        return text ? `${parts.join(' > ')} «${text}»` : parts.join(' > ');
      }

      function excused(el: El): boolean {
        let parent = el.parentElement;
        while (
          parent &&
          parent !== doc.body &&
          parent !== doc.documentElement
        ) {
          const style = view.getComputedStyle(parent);
          const mode = style.overflowX;
          if (
            mode === 'hidden' ||
            mode === 'clip' ||
            mode === 'auto' ||
            mode === 'scroll'
          ) {
            const box = parent.getBoundingClientRect();
            const fits = box.left >= -tol && box.right <= vw + tol;
            if (fits && (mode === 'auto' || mode === 'scroll')) return true;
            if (fits && box.width < vw - 16) return true;
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const scroller = doc.scrollingElement ?? doc.documentElement;
      const scroll = scroller.scrollWidth;
      if (scroll > vw + tol) {
        issues.push(
          `${viewWidth}px ${label} — document ${scroll}px > fenêtre ${vw}px`,
        );
        let widest: El | null = null;
        let widestRight = 0;
        for (const el of [...doc.querySelectorAll('body *')]) {
          if (
            el.tagName === 'PATH' ||
            el.tagName === 'CIRCLE' ||
            el.tagName === 'RECT' ||
            el.tagName === 'LINE' ||
            el.tagName === 'POLYLINE' ||
            el.tagName === 'POLYGON' ||
            el.tagName === 'ELLIPSE' ||
            el.tagName === 'G' ||
            el.tagName === 'USE'
          ) {
            continue;
          }
          const box = el.getBoundingClientRect();
          if (box.right > widestRight) {
            widestRight = box.right;
            widest = el;
          }
        }
        if (widest && widestRight > vw + tol) {
          issues.push(
            `${viewWidth}px ${label} — plus large : ${labelOf(widest)}`,
          );
        }
      }

      const nodes = [...doc.querySelectorAll('body *')];
      const overflowing: El[] = [];
      for (const el of nodes) {
        const style = view.getComputedStyle(el);
        if (style.display === 'none') continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        if (
          el.tagName === 'PATH' ||
          el.tagName === 'CIRCLE' ||
          el.tagName === 'RECT' ||
          el.tagName === 'LINE' ||
          el.tagName === 'POLYLINE' ||
          el.tagName === 'POLYGON' ||
          el.tagName === 'ELLIPSE' ||
          el.tagName === 'G' ||
          el.tagName === 'USE'
        ) {
          continue;
        }
        const box = el.getBoundingClientRect();
        if (box.width < 1 && box.height < 1) continue;
        const outside = box.right > vw + tol || box.left < -tol;
        if (!outside || excused(el)) continue;
        overflowing.push(el);
      }
      const deepest = overflowing.filter(
        (el) =>
          !overflowing.some((other) => other !== el && el.contains(other)),
      );
      for (const el of deepest.slice(0, 12)) {
        const box = el.getBoundingClientRect();
        const side = box.left < -tol ? 'gauche' : 'droite';
        const edge =
          box.left < -tol ? Math.round(box.left) : Math.round(box.right);
        issues.push(
          `${viewWidth}px ${label} — déborde (${side} ${edge}px, fenêtre ${vw}px) : ${labelOf(el)}`,
        );
      }
      if (deepest.length > 12) {
        issues.push(
          `${viewWidth}px ${label} — ${deepest.length - 12} autres débordements`,
        );
      }

      const interactive = new Set([
        'A',
        'BUTTON',
        'INPUT',
        'SELECT',
        'TEXTAREA',
      ]);
      for (const el of nodes) {
        if (!interactive.has(el.tagName) || hidden(el) || excused(el)) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 8 || box.height < 8) continue;
        if (box.right > vw + tol || box.left < -tol) {
          issues.push(
            `${viewWidth}px ${label} — contrôle hors écran : ${labelOf(el)}`,
          );
        }
      }

      for (const el of nodes) {
        if (hidden(el) || el.closest('.sr-only, [aria-hidden="true"]'))
          continue;
        const box = el.getBoundingClientRect();
        if (box.width < 24 || box.height < 12) continue;
        const style = view.getComputedStyle(el);
        const clips =
          style.overflowX === 'hidden' ||
          style.overflowX === 'clip' ||
          style.textOverflow === 'ellipsis';
        if (!clips || el.children.length > 0) continue;
        if (el.scrollWidth <= el.clientWidth + 8) continue;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length < 8) continue;
        const readable = new Set([
          'A',
          'BUTTON',
          'H1',
          'H2',
          'H3',
          'P',
          'CODE',
          'TD',
          'TH',
          'LABEL',
          'LI',
          'SPAN',
          'B',
          'STRONG',
        ]);
        if (!readable.has(el.tagName)) continue;
        issues.push(
          `${viewWidth}px ${label} — texte coupé (${el.scrollWidth}>${el.clientWidth}) : ${labelOf(el)}`,
        );
      }

      const pills = [
        ...doc.querySelectorAll(
          '.chip, .grade, .ok-chip, .pill, .badge, .pb, .sev, .st',
        ),
      ].filter(
        (el) => !hidden(el) && !el.closest('.sr-only, [aria-hidden="true"]'),
      );
      const seen = new Set<string>();
      for (let i = 0; i < pills.length; i += 1) {
        for (let j = i + 1; j < pills.length; j += 1) {
          const a = pills[i];
          const b = pills[j];
          if (!a || !b || a.contains(b) || b.contains(a)) continue;
          const aDialog = Boolean(a.closest('[role="dialog"], dialog'));
          const bDialog = Boolean(b.closest('[role="dialog"], dialog'));
          if (aDialog !== bDialog) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const left = Math.max(ra.left, rb.left);
          const right = Math.min(ra.right, rb.right);
          const top = Math.max(ra.top, rb.top);
          const bottom = Math.min(ra.bottom, rb.bottom);
          if (right - left < 10 || bottom - top < 8) continue;
          const key = `${labelOf(a)}|${labelOf(b)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          issues.push(
            `${viewWidth}px ${label} — pastilles qui se chevauchent : ${labelOf(a)} / ${labelOf(b)}`,
          );
          if (seen.size >= 6) break;
        }
        if (seen.size >= 6) break;
      }

      const tables = [...doc.querySelectorAll('table')];
      for (const table of tables) {
        if (hidden(table) || excused(table)) continue;
        const box = table.getBoundingClientRect();
        if (box.width > vw + tol || table.scrollWidth > vw + tol) {
          issues.push(
            `${viewWidth}px ${label} — tableau trop large (${Math.round(Math.max(box.width, table.scrollWidth))}px) : ${labelOf(table)}`,
          );
        }
      }

      return [...new Set(issues)].slice(0, 40);
    },
    { width, state },
  );
}

async function shoot(page: Page, id: string): Promise<void> {
  const folder = process.env.MOBILE_SHOTS;
  if (!folder) return;
  const dir = `/opt/cursor/artifacts/${folder}`;
  mkdirSync(dir, { recursive: true });
  const safe = id.replace(/[^\w.-]+/gu, '-').replace(/^-|-$/gu, '');
  await page.screenshot({
    path: `${dir}/${safe}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

test.use({ reducedMotion: 'reduce', colorScheme: 'light' });

test.describe('débordement mobile', () => {
  for (const scene of scenes()) {
    test(scene.id, async ({ page }) => {
      test.setTimeout(120_000);
      await install(page, scene);
      const response = await page.goto(scene.path, { waitUntil: 'load' });
      const status = response?.status() ?? 0;
      if (scene.path !== '/500') expect(status, scene.path).toBeLessThan(500);
      if (scene.wait) {
        await page.locator(scene.wait).first().waitFor({
          state: 'visible',
          timeout: 20_000,
        });
      }
      await page.evaluate(async () => {
        const view = globalThis as unknown as {
          document: { fonts?: { ready: Promise<unknown> } };
        };
        await view.document.fonts?.ready;
      });
      if (
        scene.plan &&
        (scene.path === '/compte' ||
          scene.path.startsWith('/compte/') ||
          scene.path === '/sites' ||
          scene.path === '/historique') &&
        !scene.action
      ) {
        const mode = await page
          .locator('[data-mode]')
          .first()
          .getAttribute('data-mode');
        expect(mode, `${scene.id} état`).not.toBe('out');
        expect(mode, `${scene.id} état`).not.toBe('pending');
        expect(mode, `${scene.id} état`).not.toBe('error');
      }
      await openState(page, scene);
      await page
        .waitForFunction(
          () => {
            const view = globalThis as unknown as {
              document: {
                querySelectorAll: (
                  selector: string,
                ) => Iterable<{ hasAttribute: (name: string) => boolean }>;
              };
            };
            const nodes = [...view.document.querySelectorAll('astro-island')];
            return (
              nodes.length === 0 ||
              nodes.every((node) => !node.hasAttribute('ssr'))
            );
          },
          { timeout: 15_000 },
        )
        .catch(() => undefined);
      const problems: string[] = [];
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 780 });
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              const view = globalThis as unknown as {
                requestAnimationFrame: (frame: () => void) => void;
              };
              view.requestAnimationFrame(() =>
                view.requestAnimationFrame(() => resolve(undefined)),
              );
            }),
        );
        const pageIssues = await collect(page, width, 'page');
        problems.push(...pageIssues);
        if (width === 330) await shoot(page, scene.id);
        if (!scene.menu) continue;
        const burger = page.locator('.axn-burger');
        if ((await burger.count()) === 0 || !(await burger.isVisible()))
          continue;
        const covered = await burger.evaluate((node) => {
          const view = globalThis as unknown as {
            document: { elementFromPoint: (x: number, y: number) => unknown };
          };
          const box = node.getBoundingClientRect();
          const top = view.document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return (
            top !== node &&
            !(
              node as unknown as { contains: (n: unknown) => boolean }
            ).contains(top)
          );
        });
        if (covered) {
          problems.push(
            `${width}px — menu mobile couvert, le bouton n’est pas atteignable`,
          );
        }
        let opened = false;
        for (let attempt = 0; attempt < 4 && !opened; attempt += 1) {
          await burger.click({ force: true, timeout: 4_000 });
          opened = await page
            .locator('.axn.is-open .axn-sheet')
            .waitFor({ state: 'visible', timeout: 1_500 })
            .then(() => true)
            .catch(() => false);
        }
        if (!opened) {
          problems.push(`${width}px — menu mobile non ouvert`);
          continue;
        }
        const known = new Set(
          pageIssues.map((item) => item.replace(' page —', ' —')),
        );
        const menuIssues = await collect(page, width, 'menu ouvert');
        problems.push(
          ...menuIssues.filter(
            (item) => !known.has(item.replace(' menu ouvert —', ' —')),
          ),
        );
        await burger.click({ force: true, timeout: 4_000 });
        await page
          .locator('.axn.is-open')
          .waitFor({ state: 'hidden', timeout: 2_000 })
          .catch(() => undefined);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});
