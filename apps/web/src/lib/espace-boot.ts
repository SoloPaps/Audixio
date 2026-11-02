import type { Plan } from '@audigy/db';
import { withinSiteQuota } from '@audigy/db';
import type { Session } from '@supabase/supabase-js';
import { tick } from 'svelte';
import { formatDate, t } from '../i18n/index.js';
import { scoreAutorise } from './apercu.js';
import { browserClient, currentSession, signOut } from './browser-session.js';
import { bindMotion, busy, reduced, say } from './espace-motion.js';
import type { PlaceSummary, PlacesState } from './places-api.js';
import { parsePlacesState } from './places-api.js';
import { latestAuditBySite } from './site-tiles.js';
import { InvalidSiteUrl, normalizeSiteUrl } from './site-url.js';

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

async function loadSites(session: Session): Promise<EspaceNext> {
  const supabase = browserClient();
  if (!supabase) return emptyNext('out');
  const token = session.access_token;
  const places = await loadPlaces(token);
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
  await Promise.all(
    [...draft.values()].map(async (mark) => {
      mark.score = await scoreAutorise(supabase, mark.auditId);
    }),
  );
  const sites: LiveSite[] = rows.map((row) => {
    const mark = draft.get(row.id);
    return {
      id: row.id,
      host: row.host,
      href: mark
        ? `/rapport?id=${encodeURIComponent(mark.auditId)}`
        : `/lancer?site=${encodeURIComponent(row.id)}`,
      verify: `/verifier?site=${encodeURIComponent(row.id)}`,
      when: mark ? formatDate(new Date(mark.at)) : '',
      score: mark?.score ?? null,
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
      if (next.mode === 'empty') rootEl.dataset.board = 'vide';
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

function bindSites(
  root: HTMLElement,
  next: EspaceNext,
  set: (value: EspaceNext) => void,
): () => void {
  const off: (() => void)[] = [];
  const form = root.querySelector<HTMLFormElement>('#addf');
  const field = root.querySelector<HTMLInputElement>('#url');
  const error = root.querySelector<HTMLElement>('#url-e');
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    if (event.target !== form) return;
    if (
      !withinSiteQuota(next.plan, next.mode === 'list' ? 2 : next.sites.length)
    ) {
      openPro(root, 'sites');
      return;
    }
    void addSite(root, next, set, field, error);
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
    draft = normalizeSiteUrl(raw);
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
    href: `/lancer?site=${encodeURIComponent(data.id)}`,
    verify: `/verifier?site=${encodeURIComponent(data.id)}`,
    when: '',
    score: null,
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

function bindHistory(root: HTMLElement): () => void {
  const off: (() => void)[] = [];
  const chart = root.querySelector<HTMLElement>('#chart');
  const svg = chart?.querySelector('svg');
  const tip = root.querySelector<HTMLElement>('#tip');
  const cross = root.querySelector<SVGLineElement>('#cross');
  const labels = ['Déc. 2025', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai 2026'];
  const values = [78, 79, 80, 81, 82, 84];
  const xOf = (index: number): number => 70 + index * 164;
  const yOf = (value: number): number => 260 - ((value - 70) / 20) * 230;
  const show = (index: number): void => {
    if (!svg || !tip || !chart || !cross) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / 960;
    tip.innerHTML = `${labels[index]} · <b>${values[index]}</b>`;
    tip.style.left = `${xOf(index) * scale - chart.scrollLeft}px`;
    tip.style.top = `${yOf(values[index] ?? 0) * scale - 14}px`;
    tip.classList.add('on');
    cross.setAttribute('x1', String(xOf(index)));
    cross.setAttribute('x2', String(xOf(index)));
    cross.style.opacity = '1';
  };
  svg?.querySelectorAll<SVGElement>('.hit').forEach((hit) => {
    const enter = (): void => show(Number(hit.dataset.i));
    hit.addEventListener('pointerenter', enter);
    off.push(() => hit.removeEventListener('pointerenter', enter));
  });
  const leave = (): void => {
    tip?.classList.remove('on');
    if (cross) cross.style.opacity = '0';
  };
  svg?.addEventListener('pointerleave', leave);
  if (svg) off.push(() => svg.removeEventListener('pointerleave', leave));
  const seg = root.querySelector<HTMLElement>('.seg');
  const ind = seg?.querySelector<HTMLElement>('.ind');
  const note = root.querySelector<HTMLElement>('#rng-note');
  const move = (button: HTMLButtonElement): void => {
    if (!ind) return;
    ind.style.width = `${button.offsetWidth}px`;
    ind.style.transform = `translateX(${button.offsetLeft}px)`;
  };
  seg?.querySelectorAll('button').forEach((button, index) => {
    const click = (): void => {
      seg.querySelectorAll('button').forEach((item) => {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      move(button);
      if (note)
        note.textContent = index
          ? t('mq.ui.range.full')
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
    for (const fn of off) fn();
  };
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
  if (gscLink) gscLink.setAttribute('href', '/search-console');
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
      location.assign('/search-console');
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
  const acc = root.querySelector<HTMLButtonElement>('#acc');
  const onAcc = (): void => {
    if (!acc) return;
    busy(acc, 700, () => {
      const box = root.querySelector<HTMLInputElement>('#consent');
      say(box?.checked ? t('mq.ui.terms.on') : t('mq.ui.terms.off'), true);
    });
  };
  acc?.addEventListener('click', onAcc);
  if (acc) off.push(() => acc.removeEventListener('click', onAcc));
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
    const row = document.getElementById(id);
    row?.classList.add('out');
    window.setTimeout(() => row?.remove(), reduced() ? 0 : 560);
    say(t('mq.ui.revoke', { who }), true);
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
  if (ssl && row.ssl_warn_days !== 14) {
    ssl.textContent = t('mq.ui.ssl', { n: row.ssl_warn_days });
  }
  if (drop && row.score_drop_points === 0)
    drop.textContent = t('mq.ui.drop.letter');
  else if (drop && row.score_drop_points !== 10) {
    drop.textContent = t('mq.ui.drop.points', { n: row.score_drop_points });
  }
  if (cadence && row.reaudit_cadence === 'daily')
    cadence.textContent = t('mq.ui.cadence.daily');
  if (cadence && row.reaudit_cadence === 'weekly')
    cadence.textContent = t('mq.ui.cadence.weekly');
  if (nextIsPro(row)) {
    const gate = root.querySelector('#gate');
    gate?.classList.remove('locked');
    root.querySelector('#fPro')?.removeAttribute('inert');
  }
}

function nextIsPro(row: {
  reaudit_cadence: string;
  score_drop_points: number;
}): boolean {
  return row.reaudit_cadence !== 'monthly' || row.score_drop_points !== 0;
}

async function saveAlerts(next: EspaceNext): Promise<void> {
  const siteId = new URLSearchParams(location.search).get('site');
  const supabase = browserClient();
  if (!siteId || !supabase) {
    say(t('mq.ui.saved'), true);
    return;
  }
  const drop = Number(
    document.querySelector<HTMLInputElement>('#drop')?.value ?? 5,
  );
  const sslLabel = document.querySelector('#ssl')?.textContent ?? '';
  const days = Number(sslLabel.match(/\d+/)?.[0] ?? 14);
  await supabase.rpc('ensure_alert_settings', { p_site_id: siteId });
  await supabase
    .from('alert_settings')
    .update({
      score_drop_points: drop,
      ssl_warn_days: days,
      alerts_enabled: true,
    })
    .eq('site_id', siteId)
    .eq('user_id', (await currentSession())?.user.id ?? '');
  say(t('mq.ui.saved'), true);
  void next;
}

function bindWelcome(root: HTMLElement, next: EspaceNext): () => void {
  const name = root.querySelector('.bv-name');
  if (name && next.name && next.name !== 'Camille')
    name.textContent = next.name;
  const steps = [...root.querySelectorAll<HTMLElement>('.step')];
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
