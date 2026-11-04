import { etaLabel, type Sim, TICK_MS, tickSim } from './progress-sim.js';

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
  const motion = gsap();
  const STATUS: Record<string, string> = {
    done: 'Analysé',
    active: 'En cours',
    next: 'Prochain',
    wait: 'En attente',
    off: 'Non testé',
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
    let done = 0;
    let active = 0;
    for (const el of caps) {
      if (el.dataset.state === 'done') done += 1;
      if (el.dataset.state === 'active') active += 1;
    }
    const node = $('#counts');
    if (!node) return;
    node.innerHTML = `<b>${active} en cours</b> · ${done} terminé${done > 1 ? 's' : ''} · ${caps.length - active - done} en attente`;
  };

  const setDomain = (key: string, state: string): void => {
    for (const el of $$(`[data-key="${key}"]`)) {
      el.dataset.state = state;
      const label = $('.stt', el);
      if (label) label.textContent = STATUS[state] ?? state;
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
    if (heading) heading.textContent = 'Votre diagnostic est prêt pour';
    if (lead) {
      lead.textContent =
        "L'analyse est terminée. Votre rapport complet, avec les priorités et le plan d'action, vous attend.";
    }
    if (live && live.textContent !== 'Rapport prêt.') {
      live.textContent = 'Analyse terminée';
    }
    setPhrase('Diagnostic terminé : votre rapport est disponible');
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
    if (simState.phrase) setPhrase(simState.phrase);
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
  setPercent(70);
  sim = window.setInterval(tick, TICK_MS);
}
