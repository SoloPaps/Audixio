import type { Plan } from '@audigy/db';
import { withinSiteQuota } from '@audigy/db';
import type { Session } from '@supabase/supabase-js';
import { tick } from 'svelte';
import { formatDate, t } from '../i18n/index.js';
import {
  type ActiveShare,
  activeShareLinks,
  type ReportLinkRow,
} from './account-access.js';
import { historySource, pickHistorySite } from './account-history.js';
import {
  alertsOpenForPlan,
  consentChecked,
  latestReportHref,
  welcomeDone,
} from './account-prefs.js';
import { apercuCarte, type MesureDomaine, mesureDomaine } from './apercu.js';
import { browserClient, currentSession, signOut } from './browser-session.js';
import { bindMotion, busy, reduced, say } from './espace-motion.js';
import { gradeForScore } from './grade.js';
import {
  axisLabels,
  GLOBAL_SERIES,
  type HistoryPoint,
  type HistoryView,
  historySummary,
} from './history.js';
import { type EvolutionChart, evolutionChart } from './history-chart.js';
import { filterHistoryPoints, historySpanOf } from './history-range.js';
import type { PlaceSummary, PlacesState } from './places-api.js';
import { parsePlacesState } from './places-api.js';
import { loadSiteHistory } from './site-history.js';
import { latestAuditBySite } from './site-tiles.js';
import { InvalidSiteUrl, normalizeSiteUrl } from './site-url.js';
import { sslSelectValue, sslWarnDays } from './ssl-days.js';

export type EspacePage =
  | 'sites'
  | 'historique'
  | 'compte'
  | 'alertes'
  | 'bienvenue';

export type EspaceMode =
  | 'pending'
  | 'out'
  | 'empty'
  | 'list'
  | 'ready'
  | 'live'
  | 'error';

export interface LiveSite {
  id: string;
  host: string;
  href: string;
  verify: string;
  when: string;
  score: number | null;
  grade: string | null;
  verified: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  performance: MesureDomaine;
  ecologie: MesureDomaine;
  securite: MesureDomaine;
  places: boolean;
  place: PlaceSummary | null;
}

export interface EspaceNext {
  mode: EspaceMode;
  notice: string;
  token: string;
  email: string;
  name: string;
  sites: LiveSite[];
  plan: Plan;
}

const DEMO = new Set(['monsite-exemple.fr', 'boutique.exemple.fr']);

const emptyNext = (mode: EspaceMode): EspaceNext => ({
  mode,
  notice: '',
  token: '',
  email: '',
  name: '',
  sites: [],
  plan: 'free',
});

function displayName(session: Session): string {
  const meta = session.user.user_metadata as
    | { full_name?: unknown }
    | undefined;
  if (typeof meta?.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  const email = session.user.email ?? '';
  const local = email.split('@')[0] ?? '';
  return local || email;
}

function asPlan(value: string | null | undefined): Plan {
  return value === 'pro' ? 'pro' : 'free';
}

async function loadPlaces(token: string): Promise<PlacesState | null> {
  try {
    const response = await fetch('/api/places', {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    if (!response.ok) return null;
    return parsePlacesState(await response.json());
  } catch {
    return null;
  }
}

function within<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    task.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function loadSites(session: Session): Promise<EspaceNext> {
  const supabase = browserClient();
  if (!supabase) return emptyNext('out');
  const token = session.access_token;
  const placesTask = loadPlaces(token);
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .maybeSingle();
  const plan = asPlan(profile?.plan);
  const { data, error } = await supabase
    .from('sites')
    .select('id, url, label, host, is_public, public_slug, expose_security')
    .eq('owner_id', session.user.id)
    .is('deleted_at', null)
    .order('label', { ascending: true });
  if (error) return { ...emptyNext('error'), token, plan };
  const rows = data ?? [];
  if (rows.length === 0) return { ...emptyNext('empty'), token, plan };
  const places = await within(placesTask, 4000, null);
  const hosts = new Set(rows.map((row) => row.host));
  if (hosts.size === DEMO.size && [...DEMO].every((host) => hosts.has(host))) {
    return { ...emptyNext('list'), token, plan };
  }
  const ids = rows.map((row) => row.id);
  const audits = await supabase
    .from('audits')
    .select('id, site_id, status, finished_at, created_at')
    .in('site_id', ids)
    .order('finished_at', { ascending: false, nullsFirst: false });
  const draft = latestAuditBySite(
    (Array.isArray(audits.data) ? audits.data : []).map((row) => ({
      ...row,
      global_score: null,
    })),
  );
  const cartes = new Map<string, Awaited<ReturnType<typeof apercuCarte>>>();
  await Promise.all(
    [...draft.values()].map(async (mark) => {
      const carte = await apercuCarte(supabase, mark.auditId);
      mark.score = carte?.score ?? null;
      cartes.set(mark.auditId, carte);
    }),
  );
  const sites: LiveSite[] = rows.map((row) => {
    const mark = draft.get(row.id);
    const carte = mark ? (cartes.get(mark.auditId) ?? null) : null;
    return {
      id: row.id,
      host: row.host,
      href: mark
        ? `/rapport?id=${encodeURIComponent(mark.auditId)}`
        : `/progression?site=${encodeURIComponent(row.id)}`,
      verify: `/verifier?site=${encodeURIComponent(row.id)}`,
      when: mark ? formatDate(new Date(mark.at)) : '',
      score: carte?.score ?? null,
      grade: carte?.grade ?? null,
      verified: carte?.verified === true,
      isPublic: row.is_public === true,
      publicSlug: row.public_slug,
      performance: mesureDomaine(carte, 'performance'),
      ecologie: mesureDomaine(carte, 'ecologie'),
      securite: mesureDomaine(carte, 'securite'),
      places: places?.enabled === true,
      place: places?.places.find((item) => item.siteId === row.id) ?? null,
    };
  });
  return {
    mode: 'live',
    notice: '',
    token,
    email: session.user.email ?? '',
    name: displayName(session),
    sites,
    plan,
  };
}

async function prepare(
  page: EspacePage,
  session: Session | null,
): Promise<EspaceNext> {
  if (page === 'bienvenue') {
    if (!session) return emptyNext('ready');
    return {
      ...emptyNext('ready'),
      token: session.access_token,
      email: session.user.email ?? '',
      name: displayName(session),
    };
  }
  const supabase = browserClient();
  if (!session || !supabase) return emptyNext('out');
  if (page === 'sites') return loadSites(session);
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .maybeSingle();
  return {
    ...emptyNext('ready'),
    token: session.access_token,
    email: session.user.email ?? '',
    name: displayName(session),
    plan: asPlan(profile?.plan),
  };
}

export function bootEspace(
  page: EspacePage,
  set: (next: EspaceNext) => void,
  getRoot: () => HTMLElement | undefined,
): () => void {
  let stop = (): void => {};
  let dead = false;
  void (async () => {
    const session = await currentSession();
    if (dead) return;
    const next = await prepare(page, session).catch(() => emptyNext('error'));
    if (dead) return;
    const rootEl = document.documentElement;
    if (page === 'sites') {
      if (next.mode === 'empty' || next.mode === 'out')
        rootEl.dataset.board = 'vide';
      else if (next.mode === 'list' || next.mode === 'live') {
        rootEl.dataset.board = 'liste';
      } else delete rootEl.dataset.board;
    }
    set(next);
    await tick();
    if (dead) return;
    const node = getRoot();
    if (!node) return;
    stop = bindPage(page, node, next, set);
  })();
  return () => {
    dead = true;
    stop();
  };
}

function bindPage(
  page: EspacePage,
  root: HTMLElement,
  next: EspaceNext,
  set: (value: EspaceNext) => void,
): () => void {
  const stops = [bindMotion(root)];
  if (page === 'sites') stops.push(bindSites(root, next, set));
  if (page === 'historique') stops.push(bindHistory(root));
  if (page === 'compte') stops.push(bindAccount(root, next));
  if (page === 'alertes') stops.push(bindAlerts(root, next));
  if (page === 'bienvenue') stops.push(bindWelcome(root, next));
  return () => {
    for (const fn of stops) fn();
  };
}

async function publishSite(
  button: HTMLButtonElement,
  current: EspaceNext,
  publish: (value: EspaceNext) => void,
): Promise<void> {
  const supabase = browserClient();
  const id = button.dataset.publish ?? '';
  const site = current.sites.find((item) => item.id === id);
  if (!supabase || !site || button.getAttribute('aria-busy') === 'true') return;
  button.setAttribute('aria-busy', 'true');
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const slug =
    site.publicSlug ||
    [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await supabase
    .from('sites')
    .update({ is_public: true, public_slug: slug })
    .eq('id', id)
    .select('is_public, public_slug')
    .single();
  button.removeAttribute('aria-busy');
  if (error || !data) {
    say(t('sites.error'), true);
    return;
  }
  publish({
    ...current,
    sites: current.sites.map((item) =>
      item.id === id
        ? { ...item, isPublic: data.is_public, publicSlug: data.public_slug }
        : item,
    ),
  });
}

function bindSites(
  root: HTMLElement,
  next: EspaceNext,
  set: (value: EspaceNext) => void,
): () => void {
  const off: (() => void)[] = [];
  let current = next;
  const publish = (value: EspaceNext): void => {
    current = value;
    set(value);
  };
  const form = root.querySelector<HTMLFormElement>('#addf');
  const field = root.querySelector<HTMLInputElement>('#url');
  const error = root.querySelector<HTMLElement>('#url-e');
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    if (event.target !== form) return;
    const count = current.mode === 'list' ? 2 : current.sites.length;
    if (!withinSiteQuota(current.plan, count)) {
      openPro(root, 'sites');
      return;
    }
    void addSite(root, current, publish, field, error);
  };
  form?.addEventListener('submit', onSubmit);
  if (form) off.push(() => form.removeEventListener('submit', onSubmit));
  const rerun = root.querySelector<HTMLButtonElement>('#rerun');
  const onRerun = (): void => {
    if (!rerun || rerun.classList.contains('spinning')) return;
    rerun.classList.add('spinning');
    rerun.setAttribute('aria-disabled', 'true');
    say(t('mq.ui.rerun'));
    window.setTimeout(
      () => {
        rerun.classList.remove('spinning');
        rerun.removeAttribute('aria-disabled');
        say(t('mq.ui.rerun.done'), true);
      },
      reduced() ? 200 : 2200,
    );
  };
  rerun?.addEventListener('click', onRerun);
  if (rerun) off.push(() => rerun.removeEventListener('click', onRerun));
  const menuButton = root.querySelector<HTMLButtonElement>('#expb');
  const menu = root.querySelector<HTMLElement>('#expm');
  const closeMenu = (): void => {
    if (!menu || !menuButton) return;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  };
  const onMenu = (): void => {
    if (!menu || !menuButton) return;
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('button')?.focus();
  };
  menuButton?.addEventListener('click', onMenu);
  if (menuButton)
    off.push(() => menuButton.removeEventListener('click', onMenu));
  const onPick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!button || !menu?.contains(button)) return;
    const fmt = button.dataset.fmt ?? '';
    closeMenu();
    menuButton?.focus();
    say(t('mq.ui.export', { fmt }), true);
  };
  menu?.addEventListener('click', onPick);
  if (menu) off.push(() => menu.removeEventListener('click', onPick));
  const onDoc = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.menu')) closeMenu();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && menu && !menu.hidden) {
      closeMenu();
      menuButton?.focus();
    }
  };
  document.addEventListener('click', onDoc);
  document.addEventListener('keydown', onKey);
  off.push(() => {
    document.removeEventListener('click', onDoc);
    document.removeEventListener('keydown', onKey);
  });
  const withdraw = root.querySelector<HTMLButtonElement>('#withdraw');
  let withdrawTimer = 0;
  const onWithdraw = (): void => {
    if (!withdraw) return;
    const label = withdraw.querySelector('.bl');
    if (!withdraw.classList.contains('confirm')) {
      withdraw.classList.add('confirm');
      if (label) label.textContent = t('mq.ui.withdraw.confirm');
      say(t('mq.ui.withdraw.ask'));
      withdrawTimer = window.setTimeout(() => {
        withdraw.classList.remove('confirm');
        if (label) label.textContent = t('mq.ui.withdraw.label');
      }, 4000);
      return;
    }
    window.clearTimeout(withdrawTimer);
    withdraw.classList.remove('confirm');
    if (label) label.textContent = t('mq.ui.withdraw.label');
    say(t('mq.ui.withdraw.done'), true);
  };
  withdraw?.addEventListener('click', onWithdraw);
  if (withdraw)
    off.push(() => withdraw.removeEventListener('click', onWithdraw));
  const onPublish = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-publish]');
    if (!button || !root.contains(button)) return;
    void publishSite(button, current, publish);
  };
  root.addEventListener('click', onPublish);
  off.push(() => root.removeEventListener('click', onPublish));
  root.querySelectorAll<HTMLElement>('[data-pro]').forEach((node) => {
    const open = (): void =>
      openPro(root, node.dataset.pro === 'liens' ? 'liens' : 'sites');
    node.addEventListener('click', open);
    off.push(() => node.removeEventListener('click', open));
  });
  off.push(bindProModal(root));
  return () => {
    window.clearTimeout(withdrawTimer);
    for (const fn of off) fn();
  };
}

async function addSite(
  root: HTMLElement,
  next: EspaceNext,
  set: (value: EspaceNext) => void,
  field: HTMLInputElement | null,
  error: HTMLElement | null,
): Promise<void> {
  const raw = field?.value.trim() ?? '';
  let draft: ReturnType<typeof normalizeSiteUrl>;
  try {
    draft = normalizeSiteUrl(raw, {
      allowLab: import.meta.env.PUBLIC_AUDIGY_LAB === '1',
    });
  } catch (caught) {
    if (caught instanceof InvalidSiteUrl) {
      field?.setAttribute('aria-invalid', 'true');
      if (error) error.textContent = t('mq.ui.url');
      field?.focus();
      return;
    }
    throw caught;
  }
  const supabase = browserClient();
  const session = await currentSession();
  if (!supabase || !session) return;
  field?.removeAttribute('aria-invalid');
  if (error) error.textContent = '';
  const button = root.querySelector<HTMLButtonElement>('#addf button');
  if (button) button.setAttribute('aria-busy', 'true');
  const { data, error: writeError } = await supabase
    .from('sites')
    .insert({
      owner_id: session.user.id,
      url: draft.url,
      scope: draft.scope,
      host: draft.host,
      path_prefix: draft.pathPrefix,
      label: draft.label,
      hosting: draft.hosting,
    })
    .select('id, url, label, host, is_public, public_slug, expose_security')
    .single();
  if (button) button.removeAttribute('aria-busy');
  if (writeError || !data) {
    if (error) {
      error.textContent =
        writeError?.code === '23505' ? t('sites.duplicate') : t('sites.error');
    }
    return;
  }
  if (field) field.value = '';
  say(t('mq.ui.added', { host: data.host }), true);
  const site: LiveSite = {
    id: data.id,
    host: data.host,
    href: `/progression?site=${encodeURIComponent(data.id)}`,
    verify: `/verifier?site=${encodeURIComponent(data.id)}`,
    when: '',
    score: null,
    grade: null,
    verified: false,
    isPublic: data.is_public === true,
    publicSlug: data.public_slug,
    performance: mesureDomaine(null, 'performance'),
    ecologie: mesureDomaine(null, 'ecologie'),
    securite: mesureDomaine(null, 'securite'),
    places: false,
    place: null,
  };
  set({
    ...next,
    mode: 'live',
    notice: '',
    sites: [...next.sites, site],
  });
}

function openPro(root: HTMLElement, kind: 'sites' | 'liens'): void {
  const modal = document.getElementById('pro-modal');
  if (!modal) return;
  const text = document.getElementById('pm-d');
  const label = document.getElementById('pm-ml');
  const value = document.getElementById('pm-mv');
  if (text) {
    text.textContent =
      kind === 'liens' ? t('mq.ui.pro.links') : t('mq.ui.pro.sites');
  }
  if (label)
    label.textContent =
      kind === 'liens' ? t('mq.ui.pro.links.l') : t('mq.ui.pro.sites.l');
  if (value)
    value.textContent =
      kind === 'liens' ? t('mq.ui.quota.links') : t('mq.ui.quota.sites');
  const main = document.getElementById('pm-main');
  const ok = document.getElementById('pm-ok');
  if (main) main.hidden = false;
  if (ok) ok.hidden = true;
  modal.hidden = false;
  modal.classList.remove('off');
  modal.classList.add('on');
  document.body.classList.add('noscroll');
  root.querySelector<HTMLElement>('#pm-email')?.focus();
}

function bindProModal(_root: HTMLElement): () => void {
  const modal = document.getElementById('pro-modal');
  if (!modal) return () => {};
  const close = (): void => {
    modal.classList.add('off');
    modal.classList.remove('on');
    document.body.classList.remove('noscroll');
    window.setTimeout(
      () => {
        modal.hidden = true;
        modal.classList.remove('off');
      },
      reduced() ? 0 : 300,
    );
  };
  const onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-close]')) close();
  };
  const form = modal.querySelector<HTMLFormElement>('#pm-form');
  const onForm = (event: Event): void => {
    event.preventDefault();
    const input = modal.querySelector<HTMLInputElement>('#pm-email');
    const err = modal.querySelector<HTMLElement>('#pm-err');
    const value = input?.value.trim() ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      input?.setAttribute('aria-invalid', 'true');
      if (err)
        err.textContent = value ? t('mq.ui.mail.bad') : t('mq.ui.mail.need');
      input?.focus();
      return;
    }
    const button = modal.querySelector<HTMLButtonElement>('#pm-sub');
    busy(button ?? modal, 800, () => {
      const mail = document.getElementById('pm-okmail');
      if (mail) mail.textContent = value;
      const main = document.getElementById('pm-main');
      const ok = document.getElementById('pm-ok');
      if (main) main.hidden = true;
      if (ok) ok.hidden = false;
      say(t('mq.ui.wait'), true);
    });
  };
  const onKey = (event: KeyboardEvent): void => {
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  modal.addEventListener('click', onClick);
  form?.addEventListener('submit', onForm);
  document.addEventListener('keydown', onKey);
  return () => {
    modal.removeEventListener('click', onClick);
    form?.removeEventListener('submit', onForm);
    document.removeEventListener('keydown', onKey);
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyEvolutionChart(svg: SVGSVGElement, chart: EvolutionChart): void {
  svg.querySelector('polyline.ln')?.setAttribute('points', chart.polyline);
  svg.querySelector('path.area')?.setAttribute('d', chart.area);
  const lines = svg.querySelectorAll('.grid line');
  const texts = svg.querySelectorAll('.grid text');
  chart.ticks.forEach((tick, index) => {
    const line = lines[index];
    const text = texts[index];
    line?.setAttribute('y1', tick.y);
    line?.setAttribute('y2', tick.y);
    if (!text) return;
    text.setAttribute('y', tick.textY);
    text.textContent = tick.label;
  });
  svg.querySelectorAll('g.pt, rect.hit').forEach((node) => {
    node.remove();
  });
  const labels = svg.querySelector('g.xl');
  const anchor = labels ?? svg.querySelector('#cross');
  if (labels) labels.replaceChildren();
  for (const mark of chart.marks) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute(
      'class',
      mark.index === chart.marks.length - 1 ? 'pt last' : 'pt',
    );
    group.style.setProperty('--d', mark.delay);
    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('class', 'halo');
    halo.setAttribute('cx', String(mark.x));
    halo.setAttribute('cy', String(mark.y));
    halo.setAttribute('r', '16');
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'dot');
    dot.setAttribute('cx', String(mark.x));
    dot.setAttribute('cy', String(mark.y));
    dot.setAttribute('r', '7');
    const value = document.createElementNS(SVG_NS, 'text');
    value.setAttribute('class', 'val');
    value.setAttribute('x', String(mark.x));
    value.setAttribute('y', String(mark.y - 20));
    value.setAttribute('text-anchor', 'middle');
    value.textContent = String(Math.round(mark.value));
    group.append(halo, dot, value);
    anchor?.parentNode?.insertBefore(group, anchor);
    if (labels) {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(mark.x));
      label.setAttribute('y', '290');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = mark.label;
      labels.append(label);
    }
    const hit = document.createElementNS(SVG_NS, 'rect');
    hit.setAttribute('class', 'hit');
    hit.setAttribute('x', String(mark.hitX));
    hit.setAttribute('y', '0');
    hit.setAttribute('width', String(mark.hitWidth));
    hit.setAttribute('height', '300');
    hit.dataset.i = String(mark.index);
    svg.append(hit);
  }
}

function paintHistoryEmpty(root: HTMLElement, host: string | null): void {
  const main = root.querySelector('main');
  if (!main) return;
  main.replaceChildren();
  const section = document.createElement('section');
  section.className = 'khero';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = t('mq.hi.005').trim();
  const heading = document.createElement('h1');
  heading.id = 't';
  heading.textContent = host ?? t('mq.hi.004');
  const lead = document.createElement('p');
  lead.textContent = host ? t('score.public.empty') : t('sites.empty');
  section.append(eyebrow, heading, lead);
  main.append(section);
}

function historyRow(point: HistoryPoint, latest: boolean): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const score = point.scores[GLOBAL_SERIES];
  const numeric = typeof score === 'number' ? Math.round(score) : null;
  const grade = gradeForScore(numeric);
  const date = document.createElement('td');
  const time = document.createElement('time');
  time.dateTime = point.at;
  time.textContent = formatDate(new Date(point.at));
  date.append(time);
  const ref = document.createElement('td');
  const code = document.createElement('code');
  code.textContent = point.id.slice(-6);
  ref.append(code);
  const note = document.createElement('td');
  note.textContent =
    grade && numeric !== null ? `${grade} · ${numeric}` : t('mq.co.086');
  const kind = document.createElement('td');
  kind.textContent = latest ? t('mq.hi.094') : t('mq.hi.101');
  const act = document.createElement('td');
  const link = document.createElement('a');
  link.className = 'btn btn-ghost btn-sm';
  link.href = point.href;
  link.textContent = t('mq.hi.095');
  act.append(link);
  tr.append(date, ref, note, kind, act);
  return tr;
}

function paintHistoryLive(
  root: HTMLElement,
  host: string,
  view: HistoryView,
  plan: string | null,
): void {
  const title = root.querySelector('#t');
  if (title) title.textContent = host;
  const crumb = root.querySelector('.crumbs li:nth-child(2) a');
  if (crumb) crumb.textContent = host;
  if (plan !== 'pro') root.querySelector('.pb')?.remove();
  const points = [...view.points].reverse();
  const latest = points[0];
  const score = latest?.scores[GLOBAL_SERIES];
  const numeric = typeof score === 'number' ? score : null;
  const grade = gradeForScore(numeric);
  const glass = root.querySelector('.sum-top .glass');
  if (glass && grade) glass.textContent = grade;
  const strong = root.querySelector('.sum-top strong');
  if (strong && grade && numeric !== null) {
    strong.textContent = `${grade} · ${Math.round(numeric)}`;
  } else {
    // Sans mesure, la maquette « B · Bon » ne doit pas rester affichée.
    if (glass) glass.textContent = '–';
    if (strong?.lastChild) strong.lastChild.textContent = t('mq.ui.grade.none');
    root
      .querySelector<HTMLElement>('.sum-top .gbar i')
      ?.style.setProperty('--v', '0');
  }
  const trend = root.querySelector('.trend span');
  if (trend) trend.textContent = historySummary(view.points, GLOBAL_SERIES);
  const when = root.querySelector('.chips time');
  if (when && latest) {
    when.setAttribute('datetime', latest.at);
    when.textContent = formatDate(new Date(latest.at));
  }
  const body = root.querySelector('table tbody');
  if (body) {
    body.replaceChildren();
    for (const [index, point] of points.entries()) {
      body.append(historyRow(point, index === 0));
    }
  }
  root.querySelector('.doms')?.closest('section')?.remove();
  const caption = root.querySelector('table caption');
  if (caption) caption.textContent = `${t('mq.hi.084')} ${host}`;
  root.querySelector('.tf span:nth-child(2)')?.remove();
  root.querySelector('.tf nav')?.remove();
  if (!latest) return;
  for (const link of root.querySelectorAll<HTMLAnchorElement>(
    'a[href="/rapport"]',
  )) {
    link.setAttribute('href', latest.href);
  }
}

function bindHistory(root: HTMLElement): () => void {
  const off: (() => void)[] = [];
  let dead = false;
  const chart = root.querySelector<HTMLElement>('#chart');
  const svg = chart?.querySelector('svg');
  const tip = root.querySelector<HTMLElement>('#tip');
  const cross = root.querySelector<SVGLineElement>('#cross');
  let labels = ['Déc. 2025', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai 2026'];
  let values = [78, 79, 80, 81, 82, 84];
  let xs = [70, 234, 398, 562, 726, 890];
  let ys = [168, 156.5, 145, 133.5, 122, 99];
  let span: ReturnType<typeof historySpanOf> | 'unset' = 'unset';
  let latestView: HistoryView | null = null;
  let axis: { min: string; max: string } | null = null;
  let full = false;
  const note = root.querySelector<HTMLElement>('#rng-note');
  const drawChart = (): void => {
    if (!latestView) return;
    const points =
      span === 'unset'
        ? latestView.points
        : filterHistoryPoints(latestView.points, span, Date.now());
    applyChart({
      ...latestView,
      points: points.length > 0 ? points : latestView.points,
    });
  };
  const show = (index: number): void => {
    if (!svg || !tip || !chart || !cross) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / 960;
    const x = xs[index] ?? 0;
    const y = ys[index] ?? 0;
    tip.innerHTML = `${labels[index] ?? ''} · <b>${values[index] ?? ''}</b>`;
    tip.style.left = `${x * scale - chart.scrollLeft}px`;
    tip.style.top = `${y * scale - 14}px`;
    tip.classList.add('on');
    cross.setAttribute('x1', String(x));
    cross.setAttribute('x2', String(x));
    cross.style.opacity = '1';
  };
  const bindHits = (): void => {
    svg?.querySelectorAll<SVGElement>('.hit').forEach((hit) => {
      const enter = (): void => show(Number(hit.dataset.i));
      hit.addEventListener('pointerenter', enter);
      off.push(() => hit.removeEventListener('pointerenter', enter));
    });
  };
  bindHits();
  const applyChart = (view: HistoryView): void => {
    if (!svg) return;
    const scored = view.points.flatMap((point) => {
      const value = point.scores[GLOBAL_SERIES];
      return typeof value === 'number' ? [{ at: point.at, value }] : [];
    });
    const names = axisLabels(
      scored.map((point) => Date.parse(point.at) / 1000),
    );
    const built = evolutionChart(
      scored.map((point, index) => ({
        label: names[index] ?? '',
        value: point.value,
      })),
    );
    if (!built) return;
    applyEvolutionChart(svg, built);
    axis = { min: String(built.min), max: String(built.max) };
    if (note && !full) note.textContent = t('mq.ui.range.axis', axis);
    labels = built.marks.map((mark) => mark.label);
    values = built.marks.map((mark) => Math.round(mark.value));
    xs = built.marks.map((mark) => mark.x);
    ys = built.marks.map((mark) => mark.y);
    const legend = root.querySelector('.legend > span:first-child');
    if (legend?.lastChild) {
      legend.lastChild.textContent =
        built.marks.length === 1
          ? t('mq.ui.legend.one')
          : t('mq.ui.legend.many', { n: String(built.marks.length) });
    }
    const average = root.querySelector('.avg [data-count]');
    if (average) {
      // Le compteur animé de la maquette (80,6) écrirait encore dans l’ancien
      // nœud : on le remplace par un nœud figé sur la vraie moyenne.
      const fresh = document.createElement('span');
      fresh.dataset.count = built.average.replace(',', '.');
      fresh.dataset.dec = '1';
      fresh.dataset.done = '1';
      fresh.textContent = built.average;
      average.replaceWith(fresh);
    }
    bindHits();
  };
  void (async () => {
    const session = await currentSession();
    const supabase = browserClient();
    if (!session || !supabase || dead) return;
    const { data: owned } = await supabase
      .from('sites')
      .select('id, host, hosting')
      .eq('owner_id', session.user.id)
      .is('deleted_at', null)
      .order('host', { ascending: true })
      .limit(8);
    if (dead) return;
    const source = historySource(owned);
    const asked =
      new URLSearchParams(location.search).get('site')?.trim() ?? '';
    if (source.kind === 'empty' && asked === '') {
      paintHistoryEmpty(root, null);
      return;
    }
    if (source.kind === 'live' && asked === '') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .maybeSingle();
      const ids = source.sites.map((site) => site.id);
      const { data: latest } = await supabase
        .from('audits')
        .select('site_id')
        .in('site_id', ids)
        .in('status', ['done', 'partial'])
        .order('finished_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (dead) return;
      const audited = latest?.[0]?.site_id;
      const site = pickHistorySite(
        source.sites,
        typeof audited === 'string' ? audited : null,
      );
      if (!site) {
        paintHistoryEmpty(root, null);
        return;
      }
      const view = await loadSiteHistory(site.id, site.hosting);
      if (dead) return;
      if (!view || view.points.length === 0) {
        paintHistoryEmpty(root, site.host);
        return;
      }
      paintHistoryLive(
        root,
        site.host,
        view,
        typeof profile?.plan === 'string' ? profile.plan : null,
      );
      latestView = view;
      drawChart();
      return;
    }
    const siteId =
      asked ||
      (Array.isArray(owned) && typeof owned[0]?.id === 'string'
        ? owned[0].id
        : '');
    if (siteId === '') return;
    if (asked === '') {
      const { data: audits } = await supabase
        .from('audits')
        .select('id')
        .eq('site_id', siteId)
        .in('status', ['done', 'partial'])
        .order('finished_at', { ascending: false })
        .limit(1);
      if (dead) return;
      const href = latestReportHref(audits?.[0]?.id ?? null);
      for (const link of root.querySelectorAll<HTMLAnchorElement>(
        'a[href="/rapport"]',
      )) {
        link.setAttribute('href', href);
      }
    }
    const listed =
      source.kind === 'live'
        ? (source.sites.find((site) => site.id === (asked || siteId)) ??
          source.sites[0])
        : null;
    const hosting = listed?.hosting ?? 'other';
    const view = await loadSiteHistory(asked || siteId, hosting);
    if (dead || !view) return;
    if (listed?.host) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .maybeSingle();
      paintHistoryLive(
        root,
        listed.host,
        view,
        typeof profile?.plan === 'string' ? profile.plan : null,
      );
    }
    latestView = view;
    drawChart();
  })();
  const leave = (): void => {
    tip?.classList.remove('on');
    if (cross) cross.style.opacity = '0';
  };
  svg?.addEventListener('pointerleave', leave);
  if (svg) off.push(() => svg.removeEventListener('pointerleave', leave));
  const seg = root.querySelector<HTMLElement>('.seg');
  const ind = seg?.querySelector<HTMLElement>('.ind');
  const move = (button: HTMLButtonElement): void => {
    if (!ind) return;
    ind.style.width = `${button.offsetWidth}px`;
    ind.style.transform = `translateX(${button.offsetLeft}px)`;
  };
  seg?.querySelectorAll('button').forEach((button, index) => {
    const click = (): void => {
      span = historySpanOf(index);
      full = index > 0;
      seg.querySelectorAll('button').forEach((item) => {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      move(button);
      drawChart();
      if (note)
        note.textContent = index
          ? t('mq.ui.range.full')
          : axis
            ? t('mq.ui.range.axis', axis)
            : t('mq.ui.range.tight');
    };
    button.addEventListener('click', click);
    off.push(() => button.removeEventListener('click', click));
    if (button.getAttribute('aria-pressed') === 'true') move(button);
  });
  root.querySelectorAll<HTMLButtonElement>('.exp').forEach((button) => {
    const click = (): void => {
      busy(button, 900, () => {
        say(t('mq.ui.report', { ref: button.dataset.ref ?? '' }), true);
      });
    };
    button.addEventListener('click', click);
    off.push(() => button.removeEventListener('click', click));
  });
  root.querySelectorAll<HTMLButtonElement>('.pag button').forEach((button) => {
    const click = (): void => {
      root.querySelectorAll('.pag button').forEach((item) => {
        item.removeAttribute('aria-current');
      });
      button.setAttribute('aria-current', 'page');
      say(t('mq.ui.page', { n: button.textContent ?? '' }));
    };
    button.addEventListener('click', click);
    off.push(() => button.removeEventListener('click', click));
  });
  return () => {
    dead = true;
    for (const fn of off) fn();
  };
}

function shareAccessRow(link: ActiveShare): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'ap-row';
  row.id = link.id;
  const avatar = document.createElement('span');
  avatar.className = 'ap-av';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = link.host.slice(0, 1).toLocaleUpperCase('fr');
  const who = document.createElement('div');
  who.className = 'ap-who';
  const name = document.createElement('b');
  name.textContent = link.host;
  const meta = document.createElement('div');
  meta.className = 'ap-meta';
  const tag = document.createElement('span');
  tag.className = 'ap-tag';
  tag.textContent = link.kind === 'team' ? t('mq.co.072') : t('mq.co.067');
  const when = document.createElement('span');
  const date = new Date(link.createdAt);
  when.textContent = Number.isNaN(date.getTime()) ? '' : formatDate(date);
  meta.append(tag, when);
  who.append(name, meta);
  const act = document.createElement('div');
  act.className = 'ap-act';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-ghost btn-sm btn-copy';
  copy.dataset.copy = `${location.origin}${link.urlPath}`;
  copy.dataset.msg = t('mq.co.078');
  const copyLabel = document.createElement('span');
  copyLabel.className = 'bl';
  copyLabel.textContent = t('mq.co.079');
  copy.append(copyLabel);
  copy.addEventListener('click', () => {
    const text = copy.dataset.copy ?? '';
    const done = (): void => {
      say(copy.dataset.msg || t('mq.ui.copied.long'), true);
    };
    const clip = navigator.clipboard;
    if (clip?.writeText) void clip.writeText(text).then(done, done);
    else done();
  });
  const revoke = document.createElement('button');
  revoke.type = 'button';
  revoke.className = 'btn btn-sm btn-revoke';
  revoke.dataset.revoke = link.id;
  revoke.dataset.who = link.host;
  revoke.dataset.site = link.host;
  revoke.setAttribute('aria-label', `${t('mq.co.081')} ${link.host}`);
  const revokeLabel = document.createElement('span');
  revokeLabel.className = 'bl';
  revokeLabel.textContent = t('mq.co.081');
  revoke.append(revokeLabel);
  act.append(copy, revoke);
  row.append(avatar, who, act);
  return row;
}

async function readActiveShares(): Promise<ActiveShare[] | null> {
  const supabase = browserClient();
  const session = await currentSession();
  if (!supabase || !session) return null;
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, audit_id, share_token, link_kind, visibility, revoked_at, expires_at, created_at',
    )
    .eq('visibility', 'link');
  if (error || !data) return null;
  const hosts = new Map<string, string>();
  const auditIds = [...new Set(data.map((row) => row.audit_id))];
  if (auditIds.length > 0) {
    const { data: audits, error: auditError } = await supabase
      .from('audits')
      .select('id, site_id')
      .in('id', auditIds);
    if (auditError || !audits) return null;
    const siteIds = [...new Set(audits.map((row) => row.site_id))];
    const { data: sites, error: siteError } =
      siteIds.length > 0
        ? await supabase
            .from('sites')
            .select('id, host, owner_id')
            .in('id', siteIds)
        : { data: [], error: null };
    if (siteError || !sites) return null;
    const owned = new Map(
      sites
        .filter((site) => site.owner_id === session.user.id)
        .map((site) => [site.id, site.host]),
    );
    for (const audit of audits) {
      const host = owned.get(audit.site_id);
      if (host) hosts.set(audit.id, host);
    }
  }
  const rows: ReportLinkRow[] = data.map((row) => ({
    id: row.id,
    auditId: row.audit_id,
    token: row.share_token,
    kind: row.link_kind,
    visibility: row.visibility,
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
  return activeShareLinks(rows, hosts, Date.now());
}

function bindAccount(root: HTMLElement, next: EspaceNext): () => void {
  const off: (() => void)[] = [];
  const emailNode = root.querySelector('.em');
  if (
    emailNode &&
    next.email &&
    emailNode.textContent?.replace(/\s/g, '') !== next.email
  ) {
    emailNode.textContent = next.email;
  }
  const gscLink = [...root.querySelectorAll('a')].find((anchor) =>
    (anchor.textContent ?? '').includes('Search Console'),
  );
  if (gscLink) gscLink.setAttribute('href', '#search-console');
  const lo = root.querySelector<HTMLButtonElement>('#lo');
  const onOut = (): void => {
    if (!lo) return;
    busy(lo, 600, () => {
      void signOut().then(() => {
        location.assign('/');
      });
    });
  };
  lo?.addEventListener('click', onOut);
  if (lo) off.push(() => lo.removeEventListener('click', onOut));
  const gsc = root.querySelector<HTMLButtonElement>('#gsc');
  const onGsc = (): void => {
    if (!gsc) return;
    busy(gsc, 400, () => {
      say(t('mq.ui.gsc'), true);
      location.hash = 'search-console';
    });
  };
  gsc?.addEventListener('click', onGsc);
  if (gsc) off.push(() => gsc.removeEventListener('click', onGsc));
  const exp = root.querySelector<HTMLButtonElement>('#exp');
  const onExport = (): void => {
    if (!exp) return;
    const bar = root.querySelector('#pb');
    bar?.classList.add('on', 'run');
    say(t('mq.ui.export.prep'));
    busy(exp, 800, () => {
      void fetch('/api/compte/export', {
        headers: { authorization: `Bearer ${next.token}` },
      }).then(async (res) => {
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'audixio-donnees.json';
        link.click();
        URL.revokeObjectURL(url);
        say(t('mq.ui.export.done'), true);
      });
    });
  };
  exp?.addEventListener('click', onExport);
  if (exp) off.push(() => exp.removeEventListener('click', onExport));
  const msg = root.querySelector<HTMLTextAreaElement>('#msg');
  const onInput = (): void => {
    const count = root.querySelector('#cnt');
    if (count && msg) count.textContent = String(msg.value.length);
  };
  msg?.addEventListener('input', onInput);
  if (msg) off.push(() => msg.removeEventListener('input', onInput));
  const form = root.querySelector<HTMLFormElement>('#cf');
  const onForm = (event: Event): void => {
    event.preventDefault();
    const hint = root.querySelector('#msge');
    if (!msg || msg.value.trim().length < 10) {
      msg?.setAttribute('aria-invalid', 'true');
      if (hint) {
        hint.className = 'err';
        hint.textContent = t('mq.ui.msg.short');
      }
      msg?.focus();
      return;
    }
    const send = root.querySelector<HTMLButtonElement>('#snd');
    const target = send ?? form;
    if (!target) return;
    busy(target, 600, () => {
      if (form) form.hidden = true;
      const sent = root.querySelector<HTMLElement>('#sent');
      sent?.classList.add('on');
      sent?.focus();
      say(t('mq.ui.sent'));
    });
  };
  form?.addEventListener('submit', onForm);
  if (form) off.push(() => form.removeEventListener('submit', onForm));
  const again = root.querySelector<HTMLButtonElement>('#again');
  const onAgain = (): void => {
    root.querySelector('#sent')?.classList.remove('on');
    if (form) form.hidden = false;
    if (msg) msg.value = '';
    onInput();
    msg?.focus();
  };
  again?.addEventListener('click', onAgain);
  if (again) off.push(() => again.removeEventListener('click', onAgain));
  const dialog = root.querySelector<HTMLDialogElement>('#dlg');
  const confirm = root.querySelector<HTMLInputElement>('#cfm');
  const ok = root.querySelector<HTMLButtonElement>('#dok');
  const del = root.querySelector<HTMLButtonElement>('#del');
  const onDel = (): void => {
    if (confirm) confirm.value = '';
    if (ok) ok.disabled = true;
    dialog?.showModal();
    confirm?.focus();
  };
  del?.addEventListener('click', onDel);
  if (del) off.push(() => del.removeEventListener('click', onDel));
  const onConfirm = (): void => {
    if (!ok || !confirm) return;
    ok.disabled = confirm.value.trim().toLocaleLowerCase('fr') !== 'supprimer';
  };
  confirm?.addEventListener('input', onConfirm);
  if (confirm) off.push(() => confirm.removeEventListener('input', onConfirm));
  const onCancel = (): void => dialog?.close();
  root.querySelector('#dc')?.addEventListener('click', onCancel);
  const onDelete = (): void => {
    dialog?.close();
    void fetch('/api/compte/suppression', {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${next.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ confirm: 'supprimer' }),
    }).then(async (res) => {
      if (!res.ok) return;
      await signOut();
      location.assign('/');
    });
  };
  ok?.addEventListener('click', onDelete);
  if (ok) off.push(() => ok.removeEventListener('click', onDelete));
  const pro = root.querySelector<HTMLButtonElement>('#pro');
  const onPro = (): void => {
    if (!pro) return;
    const pressed = pro.getAttribute('aria-pressed') === 'true';
    const label = pro.querySelector('.bl');
    if (pressed) {
      pro.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = t('mq.ui.pro.btn.off');
      say(t('mq.ui.pro.off'), true);
      return;
    }
    busy(pro, 650, () => {
      pro.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('mq.ui.pro.btn.on');
      say(t('mq.ui.pro.on'), true);
    });
  };
  pro?.addEventListener('click', onPro);
  if (pro) off.push(() => pro.removeEventListener('click', onPro));
  const consent = root.querySelector<HTMLInputElement>('#consent');
  if (consent) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('audixio-stats-consent');
    } catch {
      stored = null;
    }
    consent.checked = consentChecked(stored, consent.checked);
  }
  const acc = root.querySelector<HTMLButtonElement>('#acc');
  let termsVersion = '';
  const paintTerms = async (init?: RequestInit): Promise<boolean> => {
    if (!next.token) return false;
    const res = await fetch('/api/compte/cgu', {
      ...init,
      headers: {
        authorization: `Bearer ${next.token}`,
        'content-type': 'application/json',
      },
    }).catch(() => null);
    if (!res?.ok) return false;
    const body = (await res.json().catch(() => ({}))) as {
      version?: string;
      acceptedAt?: string | null;
    };
    if (typeof body.version === 'string') termsVersion = body.version;
    if (init) return paintTerms();
    const when = body.acceptedAt ? new Date(body.acceptedAt) : null;
    const date = root.querySelector('#acd');
    if (date)
      date.textContent =
        when && !Number.isNaN(when.getTime()) ? formatDate(when) : '—';
    return true;
  };
  void paintTerms();
  const onAcc = (): void => {
    if (!acc) return;
    busy(acc, 700, () => {
      const box = root.querySelector<HTMLInputElement>('#consent');
      try {
        localStorage.setItem('audixio-stats-consent', box?.checked ? '1' : '0');
      } catch {
        /* stockage refusé */
      }
      void paintTerms({
        method: 'post'.toUpperCase(),
        body: JSON.stringify({ version: termsVersion }),
      }).then((ok) => {
        if (!ok) return;
        say(box?.checked ? t('mq.ui.terms.on') : t('mq.ui.terms.off'), true);
      });
    });
  };
  acc?.addEventListener('click', onAcc);
  if (acc) off.push(() => acc.removeEventListener('click', onAcc));
  const paintShares = (links: readonly ActiveShare[]): void => {
    const list = root.querySelector('#apl');
    list?.replaceChildren(...links.map((link) => shareAccessRow(link)));
    const count = document.getElementById('apn');
    if (count) count.textContent = String(links.length);
    const cap = document.getElementById('apd');
    if (cap && next.plan === 'pro') cap.textContent = '';
    const meter = document.getElementById('apm');
    if (meter) meter.style.setProperty('--v', links.length === 0 ? '0' : '1');
    const empty = document.getElementById('ape');
    if (empty) empty.hidden = links.length !== 0;
  };
  const refreshShares = async (): Promise<ActiveShare[] | null> => {
    const links = await readActiveShares();
    if (links) paintShares(links);
    return links;
  };
  void refreshShares();
  const revoke = root.querySelector<HTMLDialogElement>('#dlgr');
  let current: HTMLElement | null = null;
  const onRevokeClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('[data-revoke]');
    if (!button) return;
    current = button;
    const who = document.getElementById('dlgrw');
    const site = document.getElementById('dlgrs');
    if (who) who.textContent = button.dataset.who ?? '';
    if (site) site.textContent = button.dataset.site ?? '';
    revoke?.showModal();
  };
  root.addEventListener('click', onRevokeClick);
  off.push(() => root.removeEventListener('click', onRevokeClick));
  const onRevokeOk = (): void => {
    const id = current?.dataset.revoke;
    const who = current?.dataset.who ?? '';
    revoke?.close();
    if (!id) return;
    void (async () => {
      const supabase = browserClient();
      if (!supabase) {
        say(t('api.error.internal'), true);
        return;
      }
      const { data, error } = await supabase
        .from('reports')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .is('revoked_at', null)
        .select('id');
      if (error || !data || data.length === 0) {
        say(t('api.error.internal'), true);
        return;
      }
      const links = await refreshShares();
      if (!links) {
        say(t('api.error.internal'), true);
        return;
      }
      say(t('mq.ui.revoke', { who }), true);
    })();
  };
  root.querySelector('#rok')?.addEventListener('click', onRevokeOk);
  root.querySelector('#rc')?.addEventListener('click', () => revoke?.close());
  return () => {
    for (const fn of off) fn();
  };
}

function bindAlerts(root: HTMLElement, next: EspaceNext): () => void {
  const off: (() => void)[] = [];
  const mail = root.querySelector('.lead b');
  if (mail && next.email && mail.textContent !== next.email)
    mail.textContent = next.email;
  const range = root.querySelector<HTMLInputElement>('#drop');
  const output = root.querySelector('#dropv');
  const onRange = (): void => {
    if (output && range) output.textContent = range.value;
  };
  range?.addEventListener('input', onRange);
  if (range) off.push(() => range.removeEventListener('input', onRange));
  const form = root.querySelector<HTMLFormElement>('#fPro');
  const onForm = (event: Event): void => {
    event.preventDefault();
    void saveAlerts(next);
  };
  form?.addEventListener('submit', onForm);
  if (form) off.push(() => form.removeEventListener('submit', onForm));
  if (alertsOpenForPlan(next.plan)) {
    root.querySelector('#gate')?.classList.remove('locked');
    root.querySelector('#fPro')?.removeAttribute('inert');
  }
  const params = new URLSearchParams(location.search);
  const siteId = params.get('site');
  if (siteId && next.token) void paintAlerts(root, siteId);
  return () => {
    for (const fn of off) fn();
  };
}

async function paintAlerts(root: HTMLElement, siteId: string): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  const { data, error } = await supabase.rpc('ensure_alert_settings', {
    p_site_id: siteId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return;
  const vals = [...root.querySelectorAll('.rows .val')];
  const ssl = vals[0];
  const drop = vals[1];
  const cadence = vals[3];
  const selected = sslSelectValue(Number(row.ssl_warn_days));
  const select = root.querySelector<HTMLSelectElement>('#ssl');
  if (select && selected) select.value = selected;
  if (ssl && selected)
    ssl.textContent = t('mq.ui.ssl', { n: Number(selected) });
  if (drop && row.score_drop_points === 0)
    drop.textContent = t('mq.ui.drop.letter');
  else if (drop && row.score_drop_points !== 10) {
    drop.textContent = t('mq.ui.drop.points', { n: row.score_drop_points });
  }
  if (cadence && row.reaudit_cadence === 'daily')
    cadence.textContent = t('mq.ui.cadence.daily');
  if (cadence && row.reaudit_cadence === 'weekly')
    cadence.textContent = t('mq.ui.cadence.weekly');
  const radio = root.querySelector<HTMLInputElement>(
    `input[name="fq"][value="${CADENCE_RADIO[row.reaudit_cadence] ?? 'h'}"]`,
  );
  if (radio) radio.checked = true;
  if (nextIsPro(row)) {
    const gate = root.querySelector('#gate');
    gate?.classList.remove('locked');
    root.querySelector('#fPro')?.removeAttribute('inert');
  }
}

const CADENCE_RADIO: Record<string, string> = {
  daily: 'j',
  weekly: 'h',
  monthly: 'm',
};

function nextIsPro(row: {
  reaudit_cadence: string;
  score_drop_points: number;
}): boolean {
  return row.reaudit_cadence !== 'monthly' || row.score_drop_points !== 0;
}

function radioCadence(value: string | undefined): string {
  const found = Object.entries(CADENCE_RADIO).find(([, v]) => v === value);
  return found?.[0] ?? 'weekly';
}

async function saveAlerts(next: EspaceNext): Promise<void> {
  const siteId = new URLSearchParams(location.search).get('site');
  const supabase = browserClient();
  if (!siteId || !supabase) return;
  const drop = Number(
    document.querySelector<HTMLInputElement>('#drop')?.value ?? 5,
  );
  const select = document.querySelector<HTMLSelectElement>('#ssl');
  const days = sslWarnDays({
    selected: select?.value ?? '',
    text: select?.textContent ?? '',
  });
  await supabase.rpc('ensure_alert_settings', { p_site_id: siteId });
  const { error } = await supabase
    .from('alert_settings')
    .update({
      reaudit_cadence: radioCadence(
        document.querySelector<HTMLInputElement>('input[name="fq"]:checked')
          ?.value,
      ),
      score_drop_points: drop,
      ssl_warn_days: days,
      alerts_enabled: true,
    })
    .eq('site_id', siteId)
    .eq('user_id', (await currentSession())?.user.id ?? '');
  if (error) return;
  say(t('mq.ui.saved'), true);
  void next;
}

function bindWelcome(root: HTMLElement, next: EspaceNext): () => void {
  const name = root.querySelector('.bv-name');
  if (name && next.name && next.name !== 'Camille')
    name.textContent = next.name;
  const steps = [...root.querySelectorAll<HTMLElement>('.step')];
  let saved: string[] = [];
  try {
    const raw = localStorage.getItem('audixio-welcome-steps');
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      saved = parsed.filter((item) => typeof item === 'string');
    }
  } catch {
    saved = [];
  }
  for (const step of steps) {
    if (welcomeDone(saved, step.id)) step.dataset.state = 'done';
  }
  const ring = root.querySelector<HTMLElement>('#ring');
  const count = root.querySelector('#rc');
  const labels: Record<string, string> = {
    done: t('mq.ui.done'),
    current: t('mq.ui.now'),
    todo: t('mq.ui.later'),
  };
  const update = (): number => {
    const done = steps.filter((step) => step.dataset.state === 'done').length;
    let seen = false;
    for (const step of steps) {
      if (step.dataset.state !== 'done') {
        step.dataset.state = seen ? 'todo' : 'current';
        seen = true;
      }
      const mark = step.querySelector('.st');
      const button = step.querySelector('button.mark');
      const state = step.dataset.state ?? 'todo';
      if (mark) mark.textContent = labels[state] ?? '';
      const finished = state === 'done';
      button?.setAttribute('aria-pressed', finished ? 'true' : 'false');
      if (button)
        button.textContent = finished ? t('mq.ui.marked') : t('mq.ui.mark');
    }
    ring?.style.setProperty('--pc', String(done / 3));
    if (count) count.textContent = `${done}/3`;
    const label =
      done > 1 ? t('mq.ui.rings', { n: done }) : t('mq.ui.ring', { n: done });
    ring?.setAttribute('aria-label', label);
    root.querySelectorAll('.bv-trk li').forEach((item) => {
      if (!(item instanceof HTMLElement)) return;
      const step = document.getElementById(item.dataset.k ?? '');
      if (step) item.dataset.state = step.dataset.state ?? '';
    });
    return done;
  };
  const off: (() => void)[] = [];
  for (const step of steps) {
    const button = step.querySelector('button.mark');
    const click = (): void => {
      step.dataset.state = step.dataset.state === 'done' ? 'todo' : 'done';
      try {
        localStorage.setItem(
          'audixio-welcome-steps',
          JSON.stringify(
            steps
              .filter((item) => item.dataset.state === 'done')
              .map((item) => item.id),
          ),
        );
      } catch {
        /* stockage refusé */
      }
      const n = update();
      say(n > 1 ? t('mq.ui.steps', { n }) : t('mq.ui.step', { n }), true);
    };
    button?.addEventListener('click', click);
    if (button) off.push(() => button.removeEventListener('click', click));
  }
  update();
  return () => {
    for (const fn of off) fn();
  };
}
