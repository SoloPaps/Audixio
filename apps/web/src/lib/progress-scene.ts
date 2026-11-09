import { t } from '../i18n/index.js';
import { etaLabel, type Sim, TICK_MS, tickSim } from './progress-sim.js';
import { progressCountHtml } from './progress-tally.js';
import {
  hostFromProgressQuery,
  progressEmpty,
  progressSceneSimulates,
  reportHrefFromSearch,
} from './progress-target.js';

type Gsap = {
  from: (target: string, vars: Record<string, unknown>) => void;
  fromTo: (
    target: Element | string,
    from: Record<string, unknown>,
    to: Record<string, unknown>,
  ) => void;
  to: (target: Element | string, vars: Record<string, unknown>) => void;
};

function gsap(): Gsap | null {
  const host = window as unknown as { gsap?: Gsap };
  return host.gsap ?? null;
}

/** Branche l’animation d’origine de la maquette finale. */
export function bindProgressScene(): void {
  const $ = (selector: string, root?: ParentNode): HTMLElement | null =>
    (root ?? document).querySelector(selector);
  const $$ = (selector: string, root?: ParentNode): HTMLElement[] => [
    ...(root ?? document).querySelectorAll<HTMLElement>(selector),
  ];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paintHost = (value: string): void => {
    for (const node of document.querySelectorAll('.mono')) {
      node.textContent = value;
    }
  };
  const search = location.search;
  if (new URLSearchParams(search).get('maquette') === '1') {
    paintHost(t('mq.p.001'));
  } else {
    const askedHost = hostFromProgressQuery(search);
    if (askedHost) paintHost(askedHost);
  }
  const report = document.getElementById('reportBtn');
  if (report && !progressEmpty(search)) {
    report.setAttribute('href', reportHrefFromSearch(search));
  }
  if (progressEmpty(search)) {
    const heading = $('#h1T');
    const lead = $('#leadT');
    const live = $('#liveT');
    if (heading) heading.textContent = t('progress.empty.title');
    if (lead) lead.textContent = t('progress.empty.lead');
    if (live) live.textContent = t('progress.empty.status');
  }
  const motion = gsap();
  const stateLabel = (state: string): string => {
    if (state === 'done') return t('mq.p.021');
    if (state === 'active') return t('mq.p.030');
    if (state === 'next') return t('mq.p.033');
    if (state === 'wait') return t('mq.p.036');
    if (state === 'off') return t('mq.p.039');
    return state;
  };
  const pctEl = $('#pct');
  const fill = $('#fill');
  const pbar = $('#pbar');
  const timeEl = $('#timeLeft');
  const taskEl = $('#task');
  const liveEl = $('#live');
  if (!pctEl || !fill || !pbar || !timeEl || !taskEl) return;

  let percent = 70;
  let typeTimer = 0;
  let finished = false;
  let simState: Sim = {
    percent: 70,
    si: 0,
    spoke: 0,
    finished: false,
    phrase: null,
    domains: [],
  };
  let sim = 0;

  const counts = (): void => {
    const caps = $$('.cap');
    const node = $('#counts');
    if (!node) return;
    node.innerHTML = progressCountHtml(
      caps.map((el) => el.dataset.state ?? ''),
      localStorage.getItem('audigy-locale') === 'en' ? 'en' : 'fr',
    );
  };

  const setDomain = (key: string, state: string): void => {
    for (const el of $$(`[data-key="${key}"]`)) {
      el.dataset.state = state;
      const label = $('.stt', el);
      if (label) label.textContent = stateLabel(state);
    }
    counts();
  };

  const setPercent = (value: number): void => {
    percent = Math.max(0, Math.min(100, value));
    const rounded = Math.round(percent);
    pctEl.textContent = String(rounded);
    fill.style.width = `${percent}%`;
    pbar.setAttribute('aria-valuenow', String(rounded));
    timeEl.textContent = etaLabel(percent);
  };

  const setPhrase = (txt: string): void => {
    window.clearInterval(typeTimer);
    if (liveEl) liveEl.textContent = txt;
    if (reduce) {
      taskEl.textContent = txt;
      taskEl.classList.remove('caret');
      return;
    }
    taskEl.classList.add('caret');
    taskEl.textContent = '';
    let index = 0;
    typeTimer = window.setInterval(() => {
      index += 1;
      taskEl.textContent = txt.slice(0, index);
      if (index >= txt.length) {
        window.clearInterval(typeTimer);
        window.setTimeout(() => taskEl.classList.remove('caret'), 900);
      }
    }, 18);
  };

  const burst = (): void => {
    if (!motion || reduce) return;
    const host = $('#burst');
    if (!host) return;
    const cols = ['#7091E6', '#adbbda', '#7091E6', '#3D52A0'];
    for (let index = 0; index < 34; index += 1) {
      const dot = document.createElement('i');
      dot.style.background = cols[index % 4] ?? cols[0] ?? '#7091E6';
      host.append(dot);
      const angle = Math.random() * Math.PI * 2;
      const radius = 140 + Math.random() * 190;
      motion.fromTo(
        dot,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius + 40,
          scale: 0.6 + Math.random() * 1.2,
          rotation: Math.random() * 360,
          duration: 1.6 + Math.random() * 0.8,
          ease: 'expo.out',
          onComplete: () => dot.remove(),
        },
      );
      motion.to(dot, {
        opacity: 0,
        delay: 0.9,
        duration: 1,
        ease: 'power1.in',
      });
    }
  };

  const finish = (): void => {
    if (finished) return;
    if (document.documentElement.dataset.auditOutcome === 'echec') return;
    finished = true;
    window.clearInterval(sim);
    for (const key of ['perf', 'a11y', 'code']) setDomain(key, 'done');
    setPercent(100);
    document.body.classList.add('done');
    const heading = $('#h1T');
    const lead = $('#leadT');
    const live = $('#liveT');
    if (heading) heading.textContent = t('progress.ready.heading');
    if (lead) {
      lead.textContent =
        document.documentElement.dataset.auditViewer === 'guest'
          ? t('progress.ready.lead.guest')
          : t('progress.ready.lead');
    }
    if (live && live.textContent !== t('progress.ready')) {
      live.textContent = t('progress.done.live');
    }
    setPhrase(t('progress.done.phrase'));
    const notify = $('#notify') as HTMLDialogElement | null;
    if (notify?.open) notify.close();
    burst();
    if (motion && !reduce) {
      motion.fromTo(
        '.big-ok',
        { rotate: -30 },
        { rotate: 0, duration: 1, ease: 'elastic.out(1,.5)' },
      );
    }
  };

  const tick = (): void => {
    simState = tickSim(simState);
    setPercent(simState.percent);
    if (simState.phrase) setPhrase(t(simState.phrase));
    for (const update of simState.domains) {
      setDomain(update.key, update.state);
    }
    if (simState.finished) finish();
  };

  const api = {
    set: setPercent,
    domain: setDomain,
    phrase: setPhrase,
    finish,
    markDone: finish,
  };
  (window as unknown as { audixioProgress: typeof api }).audixioProgress = api;
  counts();
  if (progressSceneSimulates(location.search)) {
    setPercent(70);
    sim = window.setInterval(tick, TICK_MS);
  } else if (!progressEmpty(location.search)) {
    const live = $('#liveT');
    if (live) live.textContent = t('progress.live');
    setPercent(0);
    for (const key of [
      'seo',
      'sec',
      'eco',
      'dns',
      'perf',
      'a11y',
      'code',
      'rgpd',
    ]) {
      setDomain(key, 'wait');
    }
  }
}
