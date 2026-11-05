/** Mouvements communs des vues portées des maquettes finales. */

import { formatFixed } from '../i18n/format.js';

export function calm(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Inclinaison légère de la carte de connexion, coupée si le mouvement est réduit. */
export function bindTilt(card: HTMLElement): () => void {
  if (
    calm() ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches
  ) {
    return () => {};
  }
  const move = (event: MouseEvent): void => {
    const x = (window.innerWidth / 2 - event.clientX) / 45;
    const y = (window.innerHeight / 2 - event.clientY) / 45;
    card.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  };
  const leave = (): void => {
    card.style.transition = 'transform .5s ease';
    card.style.transform = 'none';
  };
  const enter = (): void => {
    card.style.transition = 'none';
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseleave', leave);
  card.addEventListener('mouseenter', enter);
  return () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseleave', leave);
    card.removeEventListener('mouseenter', enter);
  };
}

function easeOut(x: number): number {
  return 1 - (1 - x) ** 3;
}

/** Compte de 0 à `data-to` en 1,1 s, ou pose la valeur finale sans mouvement. */
export function countUp(root: ParentNode, duration = 1100): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-to]')) {
    const to = Number(node.dataset.to);
    if (calm()) {
      node.textContent = String(to);
      continue;
    }
    let t0 = 0;
    node.textContent = '0';
    const step = (ts: number): void => {
      if (!t0) t0 = ts;
      const p = Math.max(0, Math.min(1, (ts - t0) / duration));
      node.textContent = String(Math.round(to * easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/**
 * Ajoute `in` aux blocs `selector` quand ils entrent dans l'écran (seuil 12 %).
 * Retourne la fonction qui coupe l'observation.
 */
export function revealAll(
  root: ParentNode,
  selector = '.rv',
  threshold = 0.12,
  onIn?: (node: Element) => void,
): () => void {
  const nodes = [...root.querySelectorAll(selector)];
  const show = (node: Element): void => {
    node.classList.add('in');
    countUp(node);
    onIn?.(node);
  };
  if (!('IntersectionObserver' in window)) {
    nodes.forEach(show);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        io.unobserve(entry.target);
      }
    },
    { threshold },
  );
  for (const node of nodes) io.observe(node);
  const onPrint = (): void => {
    for (const node of nodes) node.classList.add('in');
  };
  window.addEventListener('beforeprint', onPrint);
  return () => {
    io.disconnect();
    window.removeEventListener('beforeprint', onPrint);
  };
}

/** Relie un repère et sa ligne : survol ou focus de l'un met l'autre en avant. */
export function linkPins(root: ParentNode): () => void {
  const off: (() => void)[] = [];
  for (const pin of root.querySelectorAll<HTMLElement>('.pin[data-pin]')) {
    const row = root.querySelector<HTMLElement>(`#prio-${pin.dataset.pin}`);
    if (!row) continue;
    const enter = (): void => {
      row.classList.add('hl');
      pin.classList.add('hl');
    };
    const leave = (): void => {
      row.classList.remove('hl');
      pin.classList.remove('hl');
    };
    const pairs: [EventTarget, string, () => void][] = [
      [pin, 'pointerenter', enter],
      [pin, 'pointerleave', leave],
      [pin, 'focus', enter],
      [pin, 'blur', leave],
      [row, 'pointerenter', enter],
      [row, 'pointerleave', leave],
    ];
    for (const [target, type, fn] of pairs) {
      target.addEventListener(type, fn);
      off.push(() => target.removeEventListener(type, fn));
    }
  }
  return () => {
    for (const fn of off) fn();
  };
}

type AxApi = {
  reduce: boolean;
  countUp: (el: HTMLElement) => void;
  revealAll: () => void;
  say: (message: string, toast?: boolean) => void;
  copy?: (btn: HTMLElement, text: string, message?: string) => void;
  busy?: (btn: HTMLElement, ms: number, done?: () => void) => void;
};

function axWindow(): Window & { AX?: AxApi } {
  return window as Window & { AX?: AxApi };
}

/**
 * Révélation, compteur `data-count`, inclinaison et annonce.
 * Même séquence que les maquettes finales (seuil 0, filet à 2,5 s).
 */
export function bindMaquetteMotion(): void {
  const root = document;
  const reduce = calm();
  const countMarked = (el: HTMLElement): void => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.count);
    const dec = Number(el.dataset.dec || 0);
    if (reduce) {
      el.textContent = formatFixed(to, dec);
      return;
    }
    const dur = 1600;
    const t0 = performance.now();
    const frame = (now: number): void => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      const eased = 1 - (1 - p) ** 4;
      el.textContent = formatFixed(to * eased, dec);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  for (const group of root.querySelectorAll<HTMLElement>('[data-stagger]')) {
    let index = 0;
    for (const el of group.querySelectorAll<HTMLElement>(':scope > .rv')) {
      el.style.setProperty('--i', String(index));
      index += 1;
    }
  }
  const revealAll = (): void => {
    for (const el of root.querySelectorAll<HTMLElement>('.rv,.sheen,.gbar')) {
      el.classList.add('in');
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-count]')) {
      countMarked(el);
    }
  };
  let toastTimer = 0;
  const sayLive = (message: string, toast = false): void => {
    const live = document.getElementById('live');
    if (live) {
      live.textContent = '';
      window.setTimeout(() => {
        live.textContent = message;
      }, 50);
    }
    if (!toast) return;
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove('show'), 2600);
  };
  axWindow().AX = {
    reduce,
    countUp: countMarked,
    revealAll,
    say: sayLive,
  };
  const nodes = [...root.querySelectorAll('.rv,.sheen,[data-count],.gbar')];
  if (!('IntersectionObserver' in window)) {
    revealAll();
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.classList.add('in');
          for (const el of target.querySelectorAll<HTMLElement>(
            '[data-count]',
          )) {
            countMarked(el);
          }
          if (target.dataset.count) countMarked(target);
          io.unobserve(target);
        }
      },
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    );
    for (const node of nodes) io.observe(node);
  }
  window.addEventListener('beforeprint', revealAll);
  window.setTimeout(() => {
    for (const el of root.querySelectorAll<HTMLElement>(
      '.rv:not(.in),.gbar:not(.in)',
    )) {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('in');
        for (const child of el.querySelectorAll<HTMLElement>('[data-count]')) {
          countMarked(child);
        }
      }
    }
  }, 2500);
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    for (const card of root.querySelectorAll<HTMLElement>('.tilt')) {
      let frame = 0;
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg) translateY(-4px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        card.style.transform = '';
      });
    }
  }
}

/** Barre de lecture, sommaire actif, copie d’adresse, tracé de l’emblème. */
export function bindReadingAids(copyPrefix: string): void {
  const api = axWindow().AX;
  const progress = document.querySelector<HTMLElement>('.progress');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
  let ticket = 0;
  const onScroll = (): void => {
    if (ticket) return;
    ticket = requestAnimationFrame(() => {
      ticket = 0;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      progress?.style.setProperty(
        '--p',
        String(height > 0 ? Math.min(1, window.scrollY / height) : 0),
      );
      let current: HTMLAnchorElement | null = null;
      for (const link of links) {
        const id = link.hash.slice(1);
        const section = id ? document.getElementById(id) : null;
        if (
          section &&
          section.getBoundingClientRect().top < window.innerHeight * 0.35
        ) {
          current = link;
        }
      }
      for (const link of links) {
        if (link === current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  for (const link of links) {
    link.addEventListener('click', (event) => {
      const id = link.hash.slice(1);
      const section = id ? document.getElementById(id) : null;
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView({
        behavior: api?.reduce ? 'auto' : 'smooth',
        block: 'start',
      });
      history.replaceState(null, '', link.hash);
      window.setTimeout(
        () => section.focus({ preventScroll: true }),
        api?.reduce ? 0 : 500,
      );
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('.copy')) {
    button.addEventListener('click', () => {
      const value = button.dataset.copy ?? '';
      const done = (): void => {
        button.classList.remove('done');
        void button.offsetWidth;
        button.classList.add('done');
        // Le préfixe vient d’un data-attribut que la traduction live ne voit pas.
        const english =
          document.documentElement.lang === 'en'
            ? (globalThis as { __audigy_en?: Record<string, string> })
                .__audigy_en?.['mq.lg.111']
            : undefined;
        api?.say(`${english ?? copyPrefix}${value}`, true);
        window.setTimeout(() => button.classList.remove('done'), 2400);
      };
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(value).then(done, done);
      } else done();
    });
  }
  for (const path of document.querySelectorAll<SVGGeometryElement>(
    '.emblem .draw',
  )) {
    path.style.setProperty('--len', String(Math.ceil(path.getTotalLength())));
  }
}

/** Onde au clic, parallaxe, copie, bouton occupé, squelettes. */
export function bindRipple(labels: {
  copied: string;
  copiedLong: string;
}): void {
  const api = axWindow().AX;
  const reduce = Boolean(api?.reduce);
  document.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('.btn');
    if (!button || reduce) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ink = document.createElement('span');
    ink.className = 'rip';
    ink.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ink);
    window.setTimeout(() => ink.remove(), 700);
  });
  if (
    !reduce &&
    window.matchMedia('(hover: hover) and (min-width: 900px)').matches
  ) {
    let mx = 0;
    let my = 0;
    let sy = 0;
    let frame = 0;
    const apply = (): void => {
      for (const layer of document.querySelectorAll<HTMLElement>(
        '[data-depth]',
      )) {
        const depth = Number(layer.dataset.depth);
        layer.style.transform = `translate3d(${mx * depth * 18}px,${my * depth * 14 - sy * depth * 0.12}px,0)`;
      }
      frame = 0;
    };
    const queue = (): void => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener(
      'pointermove',
      (event) => {
        mx = event.clientX / window.innerWidth - 0.5;
        my = event.clientY / window.innerHeight - 0.5;
        queue();
      },
      { passive: true },
    );
    window.addEventListener(
      'scroll',
      () => {
        sy = Math.min(window.scrollY, 700);
        queue();
      },
      { passive: true },
    );
  }
  if (api) {
    api.copy = (btn, text, message) => {
      const done = (): void => {
        btn.classList.add('ok');
        const label = btn.querySelector('.bl');
        const previous = label?.textContent ?? '';
        if (label) label.textContent = labels.copied;
        api.say(message || labels.copiedLong, true);
        window.setTimeout(() => {
          if (label) label.textContent = previous;
          btn.classList.remove('ok');
        }, 1800);
      };
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text).then(done, done);
      } else done();
    };
    api.busy = (btn, ms, done) => {
      btn.setAttribute('aria-busy', 'true');
      window.setTimeout(
        () => {
          btn.removeAttribute('aria-busy');
          done?.();
        },
        reduce ? 150 : ms,
      );
    };
  }
  window.setTimeout(
    () => {
      for (const skeleton of document.querySelectorAll<HTMLElement>('.sk')) {
        skeleton.classList.remove('sk');
        skeleton.removeAttribute('aria-busy');
      }
    },
    reduce ? 0 : 900,
  );
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-copy]',
  )) {
    button.addEventListener('click', () => {
      api?.copy?.(button, button.dataset.copy ?? '', button.dataset.msg);
    });
  }
}

/** Message bref en bas d'écran (`.toast.show` pendant 2,6 s). */
export function say(message: string, live?: HTMLElement | null): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (live) live.textContent = message;
  const timer = Number(toast.dataset.timer ?? 0);
  if (timer) clearTimeout(timer);
  toast.dataset.timer = String(
    window.setTimeout(() => toast.classList.remove('show'), 2600),
  );
}
