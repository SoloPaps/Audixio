/**
 * Animations de l’accueil v6. Une fonction par section, chacune rend son nettoyage.
 * Aucun texte ici : les libellés viennent du HTML (traduit par i18n/live).
 * Mouvement réduit : chaque section se pose directement sur son état final.
 */

import {
  beamAt,
  clamp,
  explodeStep,
  pad,
  provisionalScore,
} from './accueil-v6-math.js';

type Off = () => void;

const reduceQuery = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function one<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode,
): T {
  const found = root.querySelector<T>(sel);
  if (!found) throw new Error(`accueil : ${sel} absent`);
  return found;
}

function all<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode,
): T[] {
  return [...root.querySelectorAll<T>(sel)];
}

function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Document | Window,
  type: K,
  fn: (event: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): Off {
  el.addEventListener(type, fn as EventListener, opts);
  return () => el.removeEventListener(type, fn as EventListener, opts);
}

function seen(
  el: Element,
  fn: (visible: boolean) => void,
  opts: IntersectionObserverInit = {},
): Off {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) fn(entry.isIntersecting);
  }, opts);
  io.observe(el);
  return () => io.disconnect();
}

function onScroll(fn: () => void): Off {
  let queued = false;
  const tick = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  };
  const a = on(window, 'scroll', tick, { passive: true });
  const b = on(window, 'resize', tick);
  fn();
  return () => {
    a();
    b();
  };
}

function setText(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

function initReveal(root: ParentNode, reduce: boolean): Off {
  const els = all('[data-rv]', root);
  if (reduce || !('IntersectionObserver' in window)) {
    for (const el of els) el.classList.add('in');
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.2 },
  );
  for (const el of els) io.observe(el);
  return () => io.disconnect();
}

function initHero(el: HTMLElement, reduce: boolean): Off {
  const vp = one('[data-scan]', el);
  const items = all('.journal li', el);
  const total = one('[data-tot]', el);
  const status = one('[data-scanst]', el);
  const ring = one<SVGElement>('[data-ringv]', el);
  const num = one('[data-ringn2]', el);
  const letter = one('[data-ringl]', el);
  const running = status.dataset.run ?? '';
  const done = status.dataset.done ?? '';
  let last = -1;
  const show = (x: number): void => {
    vp.style.setProperty('--x', `${(x * 100).toFixed(2)}%`);
    vp.style.setProperty('--xp', x.toFixed(4));
    for (const li of items)
      li.classList.toggle('on', x >= Number(li.dataset.at));
    const score = provisionalScore(x);
    if (score !== last) {
      last = score;
      ring.style.setProperty('--o', (100 - score).toFixed(1));
      setText(num, String(score));
    }
    const end = x >= 0.7;
    total.classList.toggle('on', end);
    setText(letter, end ? 'C' : '·');
    setText(status, end ? done : running);
  };
  if (reduce) {
    show(0.7);
    vp.style.setProperty('--x', '62%');
    vp.style.setProperty('--xp', '0.62');
    return () => {};
  }
  let raf = 0;
  let elapsed = 0;
  let prev = 0;
  const loop = (now: number): void => {
    elapsed += now - prev;
    prev = now;
    show(beamAt((elapsed % 7000) / 7000));
    raf = requestAnimationFrame(loop);
  };
  const stop = seen(vp, (visible) => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (visible && !document.hidden) {
      prev = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });
  return () => {
    stop();
    cancelAnimationFrame(raf);
  };
}

function initHow(el: HTMLElement, reduce: boolean): Off {
  const typing = one('[data-type]', el);
  const ring = one<SVGElement>('[data-ring]', el);
  const count = one('[data-ringn]', el);
  const how = one('[data-how]', el);
  const offs: Off[] = [];
  let iv = 0;
  let tm = 0;
  const C = 2 * Math.PI * 40;
  const seg = C / 8;
  const gap = 5;
  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 8; i += 1) {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('class', i > 4 ? 'seg lock' : 'seg');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '40');
    circle.setAttribute(
      'stroke-dasharray',
      `${(seg - gap).toFixed(2)} ${(C - seg + gap).toFixed(2)}`,
    );
    circle.setAttribute('stroke-dashoffset', (-i * seg).toFixed(2));
    ring.append(circle);
  }
  const once = (target: Element | null, fn: () => void): void => {
    if (!target) return;
    let fired = false;
    offs.push(
      seen(
        target,
        (visible) => {
          if (!visible || fired) return;
          fired = true;
          how.classList.add('in');
          fn();
        },
        { threshold: 0.25 },
      ),
    );
  };
  once(typing.closest('.step'), () => {
    const text = typing.dataset.type ?? '';
    if (reduce) {
      setText(typing, text);
      return;
    }
    let i = 0;
    iv = window.setInterval(() => {
      i += 1;
      setText(typing, text.slice(0, i));
      if (i >= text.length) window.clearInterval(iv);
    }, 80);
  });
  once(ring.closest('.step'), () => {
    const segs = all('.seg', ring);
    if (reduce) {
      for (const s of segs) s.classList.add('on');
      setText(count, '8');
      return;
    }
    let k = 0;
    const next = (): void => {
      if (k >= segs.length) return;
      segs[k]?.classList.add('on');
      k += 1;
      setText(count, String(k));
      tm = window.setTimeout(next, 260);
    };
    next();
  });
  return () => {
    for (const off of offs) off();
    window.clearInterval(iv);
    window.clearTimeout(tm);
  };
}

function initDomains(el: HTMLElement, reduce: boolean): Off {
  const tabs = all<HTMLButtonElement>('[role=tab]', el);
  const panels = all('[role=tabpanel]', el);
  const calls = all('[data-call]', el);
  const zones = all('.z', el);
  const film = one('[data-film]', el);
  const hudN = one('[data-hudn]', el);
  const hudT = one('[data-hudt]', el);
  const n = tabs.length;
  const duration =
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--dur')) || 5500;
  let current = 0;
  let auto = !reduce;
  let timer = 0;
  let visible = false;
  const light = (i: number): void => {
    const tab = tabs[i];
    if (!tab) return;
    const wanted = (tab.dataset.z ?? '').split(' ');
    const locked = tab.hasAttribute('data-lock');
    for (const zone of zones) {
      const hit = wanted.includes(zone.dataset.z ?? '');
      zone.classList.toggle('on', hit);
      zone.classList.toggle(
        'bad',
        hit && !locked && zone.dataset.z === wanted[0],
      );
      zone.classList.toggle('lockz', hit && locked);
    }
  };
  const restart = (tab: HTMLElement | undefined): void => {
    const bar = tab?.querySelector('.pg');
    if (bar) bar.replaceWith(bar.cloneNode());
  };
  const arm = (): void => {
    window.clearTimeout(timer);
    el.style.setProperty('--dur', `${duration}ms`);
    timer = window.setTimeout(() => {
      if (auto && visible) select((current + 1) % n, false);
    }, duration);
  };
  const select = (i: number, focus: boolean): void => {
    if (i === current) return;
    current = i;
    tabs.forEach((tab, j) => {
      tab.setAttribute('aria-selected', String(j === i));
      tab.tabIndex = j === i ? 0 : -1;
    });
    restart(tabs[i]);
    if (focus) tabs[i]?.focus();
    panels.forEach((panel, j) => {
      panel.classList.toggle('on', j === i);
      panel.toggleAttribute('inert', j !== i);
    });
    calls.forEach((call, j) => {
      call.classList.toggle('out', j !== i);
    });
    light(i);
    if (!reduce) {
      film.classList.add('dim');
      film.classList.remove('sweep');
      void film.offsetWidth;
      film.classList.add('sweep');
    }
    setText(hudN, `${pad(i + 1)} / ${pad(n)}`);
    setText(hudT, tabs[i]?.querySelector('.nm')?.textContent ?? '');
    if (auto) arm();
  };
  const stopAuto = (): void => {
    auto = false;
    window.clearTimeout(timer);
    el.classList.remove('auto');
  };
  light(0);
  const offs: Off[] = [
    seen(
      el,
      (v) => {
        visible = v;
        if (v && auto) {
          el.classList.add('auto');
          restart(tabs[current]);
          arm();
        } else {
          window.clearTimeout(timer);
          el.classList.remove('auto');
        }
      },
      { threshold: 0.35 },
    ),
  ];
  tabs.forEach((tab, i) => {
    offs.push(
      on(tab, 'click', () => {
        stopAuto();
        select(i, false);
      }),
    );
    offs.push(
      on(tab, 'keydown', (event) => {
        const keys: Record<string, number> = {
          ArrowDown: (i + 1) % n,
          ArrowRight: (i + 1) % n,
          ArrowUp: (i + n - 1) % n,
          ArrowLeft: (i + n - 1) % n,
          Home: 0,
          End: n - 1,
        };
        const next = keys[event.key];
        if (next === undefined) return;
        event.preventDefault();
        stopAuto();
        select(next, true);
      }),
    );
  });
  return () => {
    stopAuto();
    for (const off of offs) off();
  };
}

function initExplode(el: HTMLElement, reduce: boolean): Off {
  const stack = one('[data-stack]', el);
  const layers = all('.ly', stack);
  const items = all('[data-lyr] li', el);
  const result = one('[data-exres]', el);
  const hint = el.querySelector<HTMLElement>('.hint');
  const capN = one('[data-capn]', el);
  const capT = one('[data-capt]', el);
  const capD = one('[data-capd]', el);
  let current = -1;
  const activate = (i: number, dim: boolean): void => {
    items.forEach((li, j) => {
      li.classList.toggle('on', j === i);
    });
    layers.forEach((layer, j) => {
      layer.classList.toggle('dim', dim && j !== i);
    });
    if (i === current) return;
    current = i;
    setText(capN, pad(i + 1));
    setText(capT, items[i]?.dataset.capT ?? '');
    setText(capD, items[i]?.dataset.capD ?? '');
  };
  if (reduce) {
    activate(0, false);
    result.classList.add('on');
    return () => {};
  }
  return onScroll(() => {
    const box = el.getBoundingClientRect();
    const span = el.offsetHeight - (window.innerHeight - 64);
    const step = explodeStep(clamp(-box.top / (span > 0 ? span : 1), 0, 1));
    stack.style.setProperty('--p', step.sep.toFixed(4));
    if (hint) hint.classList.toggle('gone', step.sep > 0.1);
    activate(step.layer, step.dim);
    result.classList.toggle('on', step.done);
  });
}

function initGame(el: HTMLElement): Off {
  const view = one('[data-game]', el);
  const found = all('[data-found] li', el);
  const spots = all<HTMLButtonElement>('.spot', view);
  const xray = one<HTMLButtonElement>('[data-xr]', el);
  const count = one('[data-gcount]', el);
  const num = one('[data-gn]', el);
  const allDone = one('[data-gall]', el);
  const offs: Off[] = [];
  const update = (): void => {
    const n = spots.filter(
      (s) => s.getAttribute('aria-pressed') === 'true',
    ).length;
    const complete = n === spots.length;
    setText(num, String(n));
    count.hidden = complete;
    allDone.hidden = !complete;
  };
  for (const spot of spots) {
    offs.push(
      on(spot, 'click', () => {
        const next = spot.getAttribute('aria-pressed') !== 'true';
        spot.setAttribute('aria-pressed', String(next));
        found[Number(spot.dataset.s)]?.classList.toggle('on', next);
        update();
      }),
    );
  }
  offs.push(
    on(xray, 'click', () => {
      const next = xray.getAttribute('aria-pressed') !== 'true';
      xray.setAttribute('aria-pressed', String(next));
      view.classList.toggle('xr', next);
    }),
  );
  offs.push(
    on(one('[data-all]', el), 'click', () => {
      for (const spot of spots) spot.setAttribute('aria-pressed', 'true');
      for (const li of found) li.classList.add('on');
      xray.setAttribute('aria-pressed', 'true');
      view.classList.add('xr');
      update();
    }),
  );
  return () => {
    for (const off of offs) off();
  };
}

function initReport(el: HTMLElement): Off {
  const body = one('.rp-body', el);
  const keys = all<HTMLButtonElement>('[data-hl]', el);
  const offs: Off[] = [];
  const pick = (key: HTMLButtonElement): void => {
    body.setAttribute('data-hl-on', key.dataset.hl ?? '1');
    for (const k of keys) k.setAttribute('aria-pressed', String(k === key));
  };
  for (const key of keys) {
    offs.push(on(key, 'click', () => pick(key)));
    offs.push(on(key, 'mouseenter', () => pick(key)));
    offs.push(on(key, 'focus', () => pick(key)));
  }
  return () => {
    for (const off of offs) off();
  };
}

/** Une rangée qui défile au doigt devient focalisable au clavier. */
function initSnap(el: HTMLElement): Off {
  const row = el.querySelector<HTMLElement>('[data-snap]');
  if (!row || !('ResizeObserver' in window)) return () => {};
  const check = (): void => {
    if (row.scrollWidth > row.clientWidth + 1) row.tabIndex = 0;
    else row.removeAttribute('tabindex');
  };
  const ro = new ResizeObserver(check);
  ro.observe(row);
  return () => ro.disconnect();
}

function initFinal(el: HTMLElement, reduce: boolean): Off {
  const block = one('[data-final]', el);
  if (reduce) return () => {};
  let stopScroll: Off = () => {};
  const stop = seen(block, (visible) => {
    stopScroll();
    stopScroll = () => {};
    if (!visible) return;
    stopScroll = onScroll(() => {
      const box = block.getBoundingClientRect();
      const fx = clamp(
        1 - (box.top + box.height / 2) / window.innerHeight,
        0,
        1,
      );
      block.style.setProperty('--fx', fx.toFixed(3));
    });
  });
  return () => {
    stop();
    stopScroll();
  };
}

function initFaq(el: HTMLElement): Off {
  const items = all<HTMLDetailsElement>('details', el);
  return on(el, 'keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = items.find(
      (item) => item.open && item.contains(document.activeElement),
    );
    if (!open) return;
    open.open = false;
    open.querySelector<HTMLElement>('summary')?.focus();
  });
}

const SECTIONS: Record<string, (el: HTMLElement, reduce: boolean) => Off> = {
  top: initHero,
  comment: initHow,
  domaines: initDomains,
  couches: initExplode,
  jeu: initGame,
  rapport: initReport,
  suite: initSnap,
  tarifs: initSnap,
  faq: initFaq,
  fin: initFinal,
};

/** Lance chaque section dans sa propre tâche : aucune tâche longue au chargement. */
export function bootAccueil(root: HTMLElement): Off {
  const reduce = reduceQuery();
  const offs: Off[] = [];
  const jobs: (() => void)[] = [() => offs.push(initReveal(root, reduce))];
  for (const [id, init] of Object.entries(SECTIONS)) {
    const el = root.querySelector<HTMLElement>(`#${id}`);
    if (!el) continue;
    jobs.push(() => {
      try {
        offs.push(init(el, reduce));
      } catch {
        // Une section qui échoue reste dans son état statique, lisible.
        el.classList.add('static');
      }
    });
  }
  let stopped = false;
  const next = (): void => {
    const job = jobs.shift();
    if (!job || stopped) return;
    job();
    window.setTimeout(next, 0);
  };
  requestAnimationFrame(next);
  return () => {
    stopped = true;
    for (const off of offs) off();
  };
}
