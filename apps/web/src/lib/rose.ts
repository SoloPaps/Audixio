/**
 * Rose des scores du hub : une pétale par domaine, balayage d'entrée,
 * compteur de la note et survol relié aux cartes domaines.
 */

export interface RoseCard {
  el: HTMLElement;
  icon: string;
  short: string;
  score: number | null;
  grade: string | null;
}

export interface RoseText {
  title: string;
  desc: string;
  label: string;
  untested: string;
}

export interface RoseInput {
  cards: RoseCard[];
  score: number | null;
  grade: string | null;
  text: RoseText;
}

const NS = 'http://www.w3.org/2000/svg';
const C = 250;
const RIN = 86;
const RMAX = 196;
const PR = RMAX - RIN - 6;
const SWEEP = 1700;
const GROW = 950;
const TOTAL = SWEEP + GROW + 250;

const GRGB: Record<string, string> = {
  A: '47,163,107',
  B: '112,145,230',
  C: '224,166,58',
  D: '225,118,63',
  E: '225,118,63',
  F: '214,69,69',
};
const PETAL: Record<string, string> = {
  A: '#2FA36B',
  B: '#7091E6',
  C: '#E0A63A',
  D: '#E1763F',
  E: '#E1763F',
  F: '#D64545',
};
const INK: Record<string, string> = {
  A: '#065F3A',
  B: '#2B3B85',
  C: '#8A4B08',
  D: '#A23B0A',
  E: '#A23B0A',
  F: '#9B1C1C',
};
const TINT: Record<string, string> = {
  A: '#D6F2E3',
  B: '#DDE4F8',
  C: '#FBE8C8',
  D: '#FADBC9',
  E: '#FADBC9',
  F: '#F8D4D4',
};

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
function easeOut(x: number): number {
  return 1 - (1 - x) ** 3;
}
function easeBack(x: number): number {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}
function pt(r: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
}
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const R1 = r1.toFixed(2);
  const R0 = r0.toFixed(2);
  return `M${pt(r1, a0)} A${R1} ${R1} 0 0 1 ${pt(r1, a1)} L${pt(r0, a1)} A${R0} ${R0} 0 0 0 ${pt(r0, a0)} Z`;
}

function el(
  name: string,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElement {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  parent?.appendChild(node);
  return node;
}

export function rose(host: HTMLElement, input: RoseInput): { destroy(): void } {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { cards, text } = input;
  const g = input.score ?? 0;
  const G = input.grade ?? '–';
  const N = cards.length;
  const SEC = 360 / N;
  const th = (i: number): number => -90 + i * SEC;
  const ang = (i: number): [number, number] => {
    const d = 1.6 + (3 / 140) * 57.3;
    return [th(i) - SEC / 2 + d, th(i) + SEC / 2 - d];
  };

  host.querySelector('.rose-fb')?.remove();
  const svg = el('svg', { viewBox: '0 0 500 500', role: 'img', 'aria-labelledby': 'roseT roseD' }, host);
  el('title', { id: 'roseT' }, svg).textContent = text.title;
  el('desc', { id: 'roseD' }, svg).textContent = text.desc;
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'gLetter', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#2B3B85' }, lg);
  el('stop', { offset: '1', 'stop-color': '#7091E6' }, lg);
  for (const key of Object.keys(GRGB)) {
    const q = el('linearGradient', { id: `gP${key}`, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': TINT[key] ?? '#fff' }, q);
    el('stop', { offset: '1', 'stop-color': `rgb(${GRGB[key]})`, 'stop-opacity': '.62' }, q);
  }
  const rg = el('radialGradient', { id: 'gDisc', cx: '.5', cy: '.4', r: '.7' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.95' }, rg);
  el('stop', { offset: '.7', 'stop-color': '#fff', 'stop-opacity': '.75' }, rg);
  el('stop', { offset: '1', 'stop-color': '#EDE8F5', 'stop-opacity': '.85' }, rg);
  const fl = el('filter', { id: 'fSh', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  el('feDropShadow', { dx: 0, dy: 6, stdDeviation: 9, 'flood-color': '#3D52A0', 'flood-opacity': '.24' }, fl);

  const rings = el('g', {}, svg);
  const ringEls: SVGElement[] = [];
  for (const v of [50, 70, 90, 100]) {
    const r = RIN + 3 + (PR * v) / 100;
    ringEls.push(
      el('circle', {
        cx: C,
        cy: C,
        r,
        fill: 'none',
        stroke: `rgba(61,82,160,${v === 100 ? 0.3 : 0.16})`,
        'stroke-width': 1,
        'stroke-dasharray': v === 100 ? 'none' : '3 5',
      }, rings),
    );
    if (v === 100) continue;
    const [x, y] = pt(r, -112.5).split(' ');
    const label = el('text', { x: x ?? 0, y: y ?? 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'scale-t' }, rings);
    label.textContent = String(v);
  }
  const dash = el('circle', {
    cx: C,
    cy: C,
    r: RMAX + 9,
    fill: 'none',
    stroke: 'rgba(61,82,160,.32)',
    'stroke-width': 1.2,
    'stroke-dasharray': '2 9',
    'stroke-linecap': 'round',
    class: 'ringd',
  }, svg);

  const groups: SVGElement[] = [];
  const tracks: SVGElement[] = [];
  const petals: SVGElement[] = [];
  const sheens: (SVGElement | null)[] = [];
  const tips: (SVGElement | null)[] = [];
  const letters: SVGElement[] = [];
  const icons: SVGElement[] = [];
  cards.forEach((card, i) => {
    const grd = card.score !== null ? card.grade : null;
    const gr = el('g', { class: `pg k-${grd ?? 'N'}`, 'aria-hidden': 'true' }, svg);
    const a = ang(i);
    const tr = el('path', { class: 'track', d: sector(RIN, RMAX, a[0], a[1]) }, gr);
    const pe = grd
      ? el('path', {
          fill: `url(#gP${grd})`,
          stroke: `url(#gP${grd})`,
          'stroke-width': 6,
          'stroke-linejoin': 'round',
          style: `filter:drop-shadow(0 6px 10px rgba(${GRGB[grd]},.30))`,
        }, gr)
      : el('path', { fill: 'none', stroke: '#8697C4', 'stroke-width': 2, 'stroke-dasharray': '5 5', 'stroke-linejoin': 'round' }, gr);
    const sh = grd ? el('path', { fill: 'none', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, gr) : null;
    const ti = grd ? el('circle', { r: 4.6, fill: '#fff', stroke: PETAL[grd] ?? '#7091E6', 'stroke-width': 2.4 }, gr) : null;
    const [lx, ly] = pt(RIN + 24, th(i)).split(' ');
    const le = el('text', {
      x: lx ?? 0,
      y: ly ?? 0,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'JetBrains Mono, monospace',
      'font-weight': 700,
      'font-size': 20,
      fill: grd ? (INK[grd] ?? '#4A5585') : '#4A5585',
    }, gr);
    le.textContent = grd ?? '?';
    const [ix, iy] = pt(226, th(i)).split(' ');
    const ic = el('g', { class: 'ic' }, gr);
    el('circle', { cx: ix ?? 0, cy: iy ?? 0, r: 16 }, ic);
    el('use', { href: `#${card.icon}`, x: Number(ix) - 9, y: Number(iy) - 9, width: 18, height: 18, class: 'ico' }, ic);
    groups.push(gr);
    tracks.push(tr);
    petals.push(pe);
    sheens.push(sh);
    tips.push(ti);
    letters.push(le);
    icons.push(ic);
  });

  const sweep = el('g', {}, svg);
  for (let k = 0; k < 16; k++) {
    const a1 = -k * 3.4;
    const a0 = a1 - 3.5;
    const R = RMAX + 8;
    el('path', {
      d: `M${C} ${C} L${pt(R, a1)} A${R} ${R} 0 0 0 ${pt(R, a0)} Z`,
      fill: '#7091E6',
      'fill-opacity': (0.3 * (1 - k / 16) ** 1.7).toFixed(3),
      transform: 'translate(0 0)',
    }, sweep);
  }
  el('line', { x1: C, y1: C, x2: C + RMAX + 14, y2: C, stroke: '#3D52A0', 'stroke-width': 2, 'stroke-linecap': 'round' }, sweep);

  const disc = el('g', {}, svg);
  el('circle', { cx: C, cy: C, r: RIN - 6, fill: 'url(#gDisc)', filter: 'url(#fSh)', stroke: 'rgba(255,255,255,.95)', 'stroke-width': 2 }, disc);
  el('circle', { cx: C, cy: C, r: RIN - 4.5, fill: 'none', stroke: 'rgba(61,82,160,.14)', 'stroke-width': 1 }, disc);
  el('circle', { cx: C, cy: C, r: RIN - 15, fill: 'none', stroke: 'rgba(61,82,160,.18)', 'stroke-dasharray': '2 5' }, disc);
  const cLabel = el('text', { x: C, y: C - 44, class: 'c-label' }, disc);
  const cGrade = el('text', { x: C, y: C + 2, class: 'c-grade', fill: 'url(#gLetter)' }, disc);
  const cScore = el('text', { x: C, y: C + 46, class: 'c-score' }, disc);
  const LABEL = text.label.toLocaleUpperCase('fr-FR');
  cLabel.textContent = LABEL;

  let prog = cards.map(() => 0);
  const hov = cards.map(() => 0);
  let ringP = 0;
  let sweepA = -90;
  let sweepO = 0;
  let done = false;
  let active = -1;
  let raf = 0;
  let hraf = 0;
  let started = false;
  let T0 = 0;

  function drawAll(): void {
    for (const r of ringEls) r.setAttribute('opacity', String(ringP));
    dash.setAttribute('opacity', String(ringP));
    cards.forEach((card, i) => {
      const a = ang(i);
      const len = card.score !== null ? (PR * card.score) / 100 : PR * 0.42;
      const gw = (prog[i] ?? 0) * (1 + 0.08 * (hov[i] ?? 0));
      const r0 = RIN + 3;
      const r1 = r0 + Math.max(0.1, len * gw);
      petals[i]?.setAttribute('d', sector(r0, r1, a[0], a[1]));
      const sh = sheens[i];
      if (sh) {
        const R = (r1 - 3).toFixed(2);
        sh.setAttribute('d', r1 - r0 > 8 ? `M${pt(r1 - 3, a[0] + 3)} A${R} ${R} 0 0 1 ${pt(r1 - 3, a[1] - 3)}` : '');
        sh.setAttribute('opacity', (prog[i] ?? 0) > 0.01 ? '1' : '0');
      }
      petals[i]?.setAttribute('opacity', (prog[i] ?? 0) > 0.01 ? '1' : '0');
      tracks[i]?.setAttribute('opacity', String(ringP));
      icons[i]?.setAttribute('opacity', String(ringP));
      const tip = tips[i];
      if (tip) {
        const [x, y] = pt(r1, th(i)).split(' ');
        tip.setAttribute('cx', x ?? '0');
        tip.setAttribute('cy', y ?? '0');
        tip.setAttribute('opacity', String(clamp(((prog[i] ?? 0) - 0.4) * 2, 0, 1)));
      }
      letters[i]?.setAttribute('opacity', String(clamp(((prog[i] ?? 0) - 0.55) * 2.2, 0, 1)));
    });
    sweep.setAttribute('transform', `rotate(${sweepA.toFixed(2)} ${C} ${C})`);
    sweep.setAttribute('opacity', String(sweepO));
  }

  function pop(node: Element): void {
    node.classList.remove('pop');
    node.getBoundingClientRect();
    node.classList.add('pop');
  }

  function setCenter(i: number): void {
    const card = i < 0 ? null : cards[i];
    cLabel.textContent = card ? card.short.toLocaleUpperCase('fr-FR') : LABEL;
    if (!card || card.score !== null) {
      const gr = card ? (card.grade ?? '–') : G;
      cGrade.textContent = gr;
      cGrade.setAttribute('fill', card ? (INK[gr] ?? '#4A5585') : 'url(#gLetter)');
      cScore.textContent = `${card ? card.score : g}/100`;
    } else {
      cGrade.textContent = '—';
      cGrade.setAttribute('fill', '#8697C4');
      cScore.textContent = text.untested;
    }
    pop(cGrade);
    pop(cScore);
  }

  function applyIntro(t: number): void {
    ringP = easeOut(clamp(t / 700, 0, 1));
    prog = cards.map((_card, i) => easeBack(clamp((t - (SWEEP * i) / N + 80) / GROW, 0, 1)));
    sweepA = -90 + 360 * clamp(t / SWEEP, 0, 1);
    sweepO = t < SWEEP ? clamp(t / 150, 0, 1) : 1 - clamp((t - SWEEP) / 380, 0, 1);
    const n = Math.round(g * easeOut(clamp((t - 200) / (TOTAL - 700), 0, 1)));
    cScore.textContent = `${n}/100`;
    cGrade.textContent = t > TOTAL - 650 ? G : '';
    cLabel.textContent = LABEL;
    drawAll();
  }

  function finalize(): void {
    cancelAnimationFrame(raf);
    ringP = 1;
    prog = prog.map(() => 1);
    sweepO = 0;
    done = true;
    cGrade.setAttribute('fill', 'url(#gLetter)');
    cGrade.textContent = G;
    cScore.textContent = `${g}/100`;
    cLabel.textContent = LABEL;
    drawAll();
    if (!started) started = true;
    else pop(cGrade);
  }

  function frame(now: number): void {
    if (!T0) T0 = now;
    const t = now - T0;
    if (t >= TOTAL) {
      finalize();
      return;
    }
    applyIntro(t);
    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (started) return;
    started = true;
    if (reduce) {
      finalize();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function hloop(): void {
    let more = false;
    hov.forEach((v, i) => {
      const tg = i === active ? 1 : 0;
      hov[i] = v + (tg - v) * 0.22;
      if (Math.abs(tg - (hov[i] ?? 0)) < 0.004) hov[i] = tg;
      else more = true;
    });
    drawAll();
    hraf = more ? requestAnimationFrame(hloop) : 0;
  }

  function setActive(i: number): void {
    if (!done || i === active) return;
    active = i;
    host.classList.toggle('has-a', i > -1);
    groups.forEach((gr, k) => {
      gr.classList.toggle('on', k === i);
      cards[k]?.el.classList.toggle('hl', k === i);
    });
    setCenter(i);
    if (!hraf) hraf = requestAnimationFrame(hloop);
  }

  applyIntro(0);

  let lastPT = 'mouse';
  const off: (() => void)[] = [];
  function on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | string,
    fn: (event: PointerEvent) => void,
  ): void {
    const handler = fn as EventListener;
    target.addEventListener(type, handler);
    off.push(() => target.removeEventListener(type, handler));
  }
  groups.forEach((gr, i) => {
    on(gr, 'pointerenter', (e) => {
      lastPT = e.pointerType;
      if (e.pointerType !== 'touch') setActive(i);
    });
    on(gr, 'pointerleave', (e) => {
      if (e.pointerType !== 'touch') setActive(-1);
    });
    on(gr, 'pointerdown', (e) => {
      lastPT = e.pointerType;
    });
    on(gr, 'click', () => {
      if (lastPT === 'touch' && active !== i) {
        setActive(i);
        return;
      }
      const target = cards[i]?.el;
      if (!target) return;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      history.replaceState(null, '', `#${target.id}`);
      target.style.animation = 'none';
      target.getBoundingClientRect();
      target.style.animation = '';
      target.focus({ preventScroll: true });
    });
  });
  on(document, 'pointerdown', (e) => {
    if (e.pointerType === 'touch' && !(e.target as Element | null)?.closest?.('#rose')) setActive(-1);
  });
  cards.forEach((card, i) => {
    on(card.el, 'pointerenter', (e) => {
      if (e.pointerType !== 'touch') setActive(i);
    });
    on(card.el, 'pointerleave', (e) => {
      if (e.pointerType !== 'touch') setActive(-1);
    });
    on(card.el, 'focus', () => setActive(i));
    on(card.el, 'blur', () => setActive(-1));
  });
  const onPrint = (): void => {
    started = true;
    finalize();
  };
  window.addEventListener('beforeprint', onPrint);

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) start();
      },
      { threshold: 0.35 },
    );
    io.observe(host);
  } else {
    start();
  }

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(hraf);
      io?.disconnect();
      window.removeEventListener('beforeprint', onPrint);
      for (const fn of off) fn();
    },
  };
}
