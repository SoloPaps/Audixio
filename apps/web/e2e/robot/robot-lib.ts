import type { APIRequestContext, Browser, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ORIGIN } from '../origin.js';
import { stubSiteAccount } from '../site-session.js';

/**
 * Robot de fin de lot : chaque lien mène à une vraie page (redirections
 * suivies, ancres présentes) et chaque bouton visible fait quelque chose.
 * Données : compte simulé local et audit invité en sessionStorage, jamais un vrai compte.
 */

export const AUDIT = '00000000-0000-4000-8000-00000000c701';

export interface RobotPage {
  path: string;
  /** Compte simulé (pages connectées). */
  session?: boolean;
  /** Audit invité déposé avant la visite (pages du rapport). */
  report?: boolean;
}

export const PAGES: RobotPage[] = [
  { path: '/' },
  { path: '/methode' },
  { path: '/pro' },
  { path: '/passer-pro' },
  { path: '/exemple-rapport' },
  { path: '/accessibilite' },
  { path: '/ecoconception' },
  { path: '/robot' },
  { path: '/demande-acces' },
  { path: '/verifier' },
  { path: '/verifier/00000000-0000-4000-8000-000000000019' },
  { path: '/score/exemple-score-verifie' },
  { path: '/partage/abababababababababababababababab' },
  { path: '/progression?maquette=1' },
  { path: '/audit-echoue' },
  { path: '/connexion' },
  { path: '/inscription' },
  { path: '/email-confirme' },
  { path: '/reinitialisation' },
  { path: '/cgu' },
  { path: '/confidentialite' },
  { path: '/mentions-legales' },
  { path: '/cookies' },
  { path: '/page-inexistante' },
  { path: '/500' },
  { path: '/maintenance' },
  { path: `/rapport/${AUDIT}`, report: true },
  { path: `/rapport/${AUDIT}/domaines`, report: true },
  { path: `/rapport/${AUDIT}/domaines/qualite`, report: true },
  { path: `/rapport/${AUDIT}/constats`, report: true },
  { path: `/rapport/${AUDIT}/plan`, report: true },
  { path: `/rapport/${AUDIT}/brief`, report: true },
  { path: '/sites', session: true },
  { path: '/sites/bon.audigy.test', session: true },
  { path: '/compte', session: true },
  { path: '/historique', session: true },
  { path: '/bienvenue', session: true },
  { path: '/sites/exemple.fr/demandes/req_948f2a1b7e', session: true },
];

export interface Mode {
  lang: 'fr' | 'en';
  theme: 'light' | 'dark';
  width: 390 | 1440;
}

export const ALL_MODES: Mode[] = (['fr', 'en'] as const).flatMap((lang) =>
  (['light', 'dark'] as const).flatMap((theme) =>
    ([390, 1440] as const).map((width) => ({ lang, theme, width })),
  ),
);

export function modeName(mode: Mode): string {
  return `${mode.lang}-${mode.theme}-${mode.width}`;
}

// Côté navigateur : des chaînes, les e2e n’ont pas les types du DOM.
const INIT = `(() => {
  const flag = (name) => { (globalThis.__robot ??= []).push(name); };
  globalThis.print = () => flag('print');
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (...args) => { flag('pushState'); push(...args); };
  history.replaceState = (...args) => { flag('replaceState'); replace(...args); };
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText = async () => flag('clipboard');
      navigator.clipboard.write = async () => flag('clipboard');
    }
  } catch {}
  for (const type of ['submit', 'invalid', 'toggle', 'reset']) {
    document.addEventListener(type, () => flag(type), true);
  }
})()`;

const LINKS = `[...document.querySelectorAll('a[href]')]
  .filter((a) => !a.closest('template'))
  .map((a) => ({
    href: a.href,
    raw: a.getAttribute('href') ?? '',
    label: (a.getAttribute('aria-label') ?? a.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 60),
  }))`;

const MARK = `(() => {
  const list = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]')]
    .filter((el) => {
      if (el.disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      if (el.closest('[inert], template')) return false;
      if (el.tagName === 'A') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && el.checkVisibility({ visibilityProperty: true });
    });
  return list.map((el, n) => {
    el.dataset.robot = String(n);
    return { n, label: (el.getAttribute('aria-label') ?? el.textContent ?? el.getAttribute('value') ?? '').replace(/\\s+/g, ' ').trim().slice(0, 60) };
  });
})()`;

const WATCH = `(() => {
  globalThis.__robot = [];
  const sig = (m) => {
    const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    return (t ? t.tagName + '.' + [...t.classList].join('.') : '?') + ':' + m.type + ':' + (m.attributeName || '');
  };
  globalThis.__base = new Set();
  globalThis.__muts = [];
  globalThis.__phase = 'base';
  if (globalThis.__obs) globalThis.__obs.disconnect();
  globalThis.__obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.attributeName === 'data-robot') continue;
      const s = sig(m);
      if (globalThis.__phase === 'base') globalThis.__base.add(s);
      else if (!globalThis.__base.has(s)) globalThis.__muts.push(s);
    }
  });
  globalThis.__obs.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
})()`;

const STATE = `(() => {
  const focused = document.activeElement;
  return {
    flags: globalThis.__robot ?? [],
    muts: globalThis.__muts ?? [],
    y: scrollY,
    x: scrollX,
    focus: focused && focused !== globalThis.__btn && focused !== document.body ? focused.outerHTML.slice(0, 80) : '',
  };
})()`;

function reportPayload(): unknown {
  const finding = (domain: string, checkId: string, messageKey: string) => ({
    domain,
    checkId,
    status: 'fail',
    severity: 4,
    impact: 3,
    score: 0,
    measured: {},
    messageKey,
    params: {},
    fixKey: checkId,
    effortMinutes: 15,
    reason: null,
  });
  return {
    audit: {
      id: AUDIT,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.1.0',
      globalScore: 64,
      siteVerified: false,
      partialLabel: null,
      coverage: 1,
      createdAt: '2026-10-28T10:00:00.000Z',
      startedAt: '2026-10-28T10:00:01.000Z',
      finishedAt: '2026-10-28T10:05:00.000Z',
      error: null,
      site: {
        id: '00000000-0000-4000-8000-00000000c702',
        url: 'https://robot.audigy.test',
        label: 'robot.audigy.test',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [
      { domain: 'performance', score: 80, coverage: 1, level: 'good' },
      { domain: 'qualite', score: 40, coverage: 1, level: 'problem' },
    ],
    findings: [
      finding('qualite', 'qualite.liens', 'qualite.liens.fail_internal_one'),
    ],
  };
}

/** Ouvre un contexte réglé (langue, thème, largeur) et prépare la page. */
export async function openMode(
  browser: Browser,
  target: RobotPage,
  mode: Mode,
): Promise<Page> {
  const context = await browser.newContext({
    baseURL: ORIGIN,
    viewport: { width: mode.width, height: mode.width === 390 ? 844 : 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('dialog', (dialog) => {
    void dialog.dismiss().catch(() => undefined);
  });
  if (target.session) await stubSiteAccount(page);
  await page.addInitScript(INIT);
  if (mode.lang === 'en') {
    // « ?lang=en » : le dictionnaire est rangé puis la page se recharge sans le paramètre
    // (le sélecteur de langue est dans le menu à 390 px).
    await page.goto(`/?lang=en&theme=${mode.theme}`);
    await expect
      .poll(
        () =>
          page
            .evaluate<boolean>(
              "document.readyState === 'complete' && !new URL(location.href).searchParams.has('lang') && localStorage.getItem('audigy-locale') === 'en'",
            )
            .catch(() => false),
        { timeout: 20_000 },
      )
      .toBe(true);
    await page.waitForLoadState('networkidle');
  }
  if (target.report) {
    await page.goto(`/cgu?theme=${mode.theme}`);
    await page.evaluate(
      `sessionStorage.setItem('audixio-guest-audit', ${JSON.stringify(
        JSON.stringify({ [AUDIT]: reportPayload() }),
      )})`,
    );
  }
  return page;
}

export async function visit(
  page: Page,
  path: string,
  theme: string,
): Promise<void> {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}theme=${theme}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

export interface FoundLink {
  href: string;
  raw: string;
  label: string;
}

export async function collectLinks(page: Page): Promise<FoundLink[]> {
  return page.evaluate<FoundLink[]>(LINKS);
}

const statusCache = new Map<string, Promise<number>>();
const htmlCache = new Map<string, Promise<string>>();

async function statusOf(
  request: APIRequestContext,
  path: string,
): Promise<number> {
  let hit = statusCache.get(path);
  if (!hit) {
    hit = request
      .get(path, { timeout: 30_000 })
      .then(async (response) => {
        const type = response.headers()['content-type'] ?? '';
        if (type.includes('html')) htmlCache.set(path, response.text());
        return response.status();
      })
      .catch(() => 0);
    statusCache.set(path, hit);
  }
  return hit;
}

const anchorCache = new Map<string, Promise<boolean>>();

/**
 * Ancre posée par le script de la page (absente du HTML servi) : on ouvre la
 * page dans le même contexte (même onglet : même compte simulé, même audit) et on
 * la cherche après le chargement.
 */
function anchorInBrowser(
  page: Page,
  path: string,
  id: string,
): Promise<boolean> {
  const key = `${path}#${id}`;
  let hit = anchorCache.get(key);
  if (!hit) {
    hit = (async () => {
      try {
        // Chargement neuf, même si l’adresse ne diffère que par l’ancre.
        await page.goto('about:blank');
        await page.goto(`${path}#${encodeURIComponent(id)}`, {
          waitUntil: 'networkidle',
          timeout: 30_000,
        });
        // Une ancre-commande (« #partager » ouvre la feuille de partage) est
        // prise en charge : la page l’a consommée ou a ouvert un dialogue.
        // Attente active : le script de la page peut finir tard (CI lente).
        const ok = `!!document.getElementById(${JSON.stringify(id)}) || document.getElementsByName(${JSON.stringify(id)}).length > 0 || location.hash !== ${JSON.stringify(`#${encodeURIComponent(id)}`)} || [...document.querySelectorAll('[role=dialog][aria-modal=true], dialog[open]')].some((d) => d.getClientRects().length > 0)`;
        return await page
          .waitForFunction(ok, undefined, { timeout: 8_000, polling: 200 })
          .then(
            () => true,
            () => false,
          );
      } catch {
        return false;
      }
    })();
    anchorCache.set(key, hit);
  }
  return hit;
}

/** Problèmes des liens d’une page : destination morte, ancre absente, faux lien. */
export async function checkLinks(
  page: Page,
  request: APIRequestContext,
  links: FoundLink[],
): Promise<string[]> {
  const problems: string[] = [];
  const here = new URL(page.url());
  const seen = new Set<string>();
  const later: { path: string; id: string; label: string }[] = [];
  for (const link of links) {
    const key = `${link.raw}|${link.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = link.raw.trim();
    if (raw === '#' || raw === '' || raw.startsWith('javascript:')) {
      problems.push(`lien sans destination « ${link.label} » (href="${raw}")`);
      continue;
    }
    if (/^(mailto|tel):/u.test(raw)) continue;
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      problems.push(`adresse invalide « ${link.label} » (${raw})`);
      continue;
    }
    if (url.origin !== new URL(ORIGIN).origin) continue; // externes : à part
    if (url.pathname.startsWith('/api/')) continue;
    const samePage =
      url.pathname === here.pathname &&
      url.search === here.search &&
      url.hash !== '';
    if (samePage || (raw.startsWith('#') && raw.length > 1)) {
      const id = decodeURIComponent(url.hash.slice(1));
      const found = await page.evaluate<boolean>(
        `!!document.getElementById(${JSON.stringify(id)}) || document.getElementsByName(${JSON.stringify(id)}).length > 0`,
      );
      if (!found) problems.push(`ancre absente « ${link.label} » (${raw})`);
      continue;
    }
    const path = `${url.pathname}${url.search}`;
    // Lien vers la page elle-même (langue « ?lang=en », thème…) : elle vient
    // d’être chargée, son statut est le sien (une 404 reste une 404).
    if (url.pathname === here.pathname && url.hash === '') continue;
    const status = await statusOf(request, path);
    const known =
      (url.pathname === '/404' && status === 404) ||
      (url.pathname === '/500' && status === 500);
    if ((status >= 400 || status === 0) && !known) {
      problems.push(`lien mort « ${link.label} » → ${path} (${status})`);
      continue;
    }
    if (url.hash.length > 1) {
      const id = decodeURIComponent(url.hash.slice(1));
      const html = (await htmlCache.get(path)) ?? '';
      if (!html.includes(`id="${id}"`) && !html.includes(`name="${id}"`)) {
        later.push({ path, id, label: link.label });
      }
    }
  }
  // En dernier : ces vérifications rechargent l’onglet (même sessionStorage).
  for (const item of later) {
    if (!(await anchorInBrowser(page, item.path, item.id))) {
      problems.push(
        `ancre absente « ${item.label} » → ${item.path}#${item.id}`,
      );
    }
  }
  return problems;
}

/** Repère les boutons visibles et actifs ; chacun reçoit un numéro stable. */
export async function markButtons(
  page: Page,
): Promise<{ n: number; label: string }[]> {
  return page.evaluate<{ n: number; label: string }[]>(MARK);
}

/** Clique un bouton et dit ce qui s’est passé ; null si rien. */
export async function probeButton(
  page: Page,
  n: number,
): Promise<string | null> {
  const button = page.locator(`[data-robot="${n}"]`);
  if (!(await button.isVisible().catch(() => false))) return 'déjà retiré';
  const before = page.url();
  await page.evaluate(WATCH);
  await page.waitForTimeout(250);
  const start = await page.evaluate<{ y: number; x: number; focus: string }>(
    STATE,
  );
  let requests = 0;
  let popup = false;
  let download = false;
  const onRequest = (req: { resourceType: () => string }) => {
    if (['fetch', 'xhr', 'document'].includes(req.resourceType()))
      requests += 1;
  };
  const onPopup = () => {
    popup = true;
  };
  const onDownload = () => {
    download = true;
  };
  let chooser = false;
  const onChooser = () => {
    chooser = true;
  };
  page.on('filechooser', onChooser);
  page.on('request', onRequest);
  page.context().on('page', onPopup);
  page.on('download', onDownload);
  await page.evaluate(
    `(() => { globalThis.__phase = 'click'; globalThis.__btn = document.querySelector('[data-robot="${n}"]'); })()`,
  );
  await button.click({ timeout: 3_000 }).catch(() => undefined);
  await page.waitForTimeout(550);
  page.off('request', onRequest);
  page.context().off('page', onPopup);
  page.off('download', onDownload);
  page.off('filechooser', onChooser);
  if (page.url() !== before) return 'navigation';
  if (chooser) return 'sélecteur de fichier';
  if (popup) return 'nouvel onglet';
  if (download) return 'téléchargement';
  if (requests > 0) return 'requête';
  const state = await page
    .evaluate<{
      flags: string[];
      muts: string[];
      y: number;
      x: number;
      focus: string;
    }>(STATE)
    .catch(() => null);
  if (!state) return 'navigation';
  if (state.flags.length) return state.flags.join(',');
  if (state.muts.length) return `dom:${state.muts[0]}`;
  if (state.y !== start.y || state.x !== start.x) return 'défilement';
  if (state.focus !== '' && state.focus !== start.focus) return 'focus';
  return null;
}
