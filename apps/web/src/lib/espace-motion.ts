import { formatFixed } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { copyText } from './clipboard.js';

export function reduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function say(message: string, toast = false): void {
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
  const prev = Number(node.dataset.timer ?? 0);
  if (prev) window.clearTimeout(prev);
  node.dataset.timer = String(
    window.setTimeout(() => node.classList.remove('show'), 2600),
  );
}

function countOne(el: HTMLElement): void {
  if (el.dataset.done === '1') return;
  el.dataset.done = '1';
  const to = Number(el.dataset.count);
  if (!Number.isFinite(to)) return;
  const dec = Number(el.dataset.dec ?? 0);
  const dur = reduced() ? 0 : 1600;
  const t0 = performance.now();
  const frame = (now: number): void => {
    const p = dur ? Math.min(1, (now - t0) / dur) : 1;
    const eased = 1 - (1 - p) ** 4;
    el.textContent = formatFixed(to * eased, dec);
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Révélations, compteurs, inclinaison, ondulation et copie. */
export function bindMotion(root: ParentNode): () => void {
  const off: (() => void)[] = [];
  const calm = reduced();
  root.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    group.querySelectorAll<HTMLElement>(':scope > .rv').forEach((el, index) => {
      el.style.setProperty('--i', String(index));
    });
  });
  const show = (el: Element): void => {
    el.classList.add('in');
    el.querySelectorAll<HTMLElement>('[data-count]').forEach(countOne);
    if (el instanceof HTMLElement && el.dataset.count) countOne(el);
  };
  const nodes = [...root.querySelectorAll('.rv,.sheen,[data-count],.gbar')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    );
    for (const node of nodes) io.observe(node);
    off.push(() => io.disconnect());
  } else {
    for (const node of nodes) show(node);
  }
  const reveal = (): void => {
    root.querySelectorAll('.rv,.sheen,.gbar').forEach((el) => {
      el.classList.add('in');
    });
    root.querySelectorAll<HTMLElement>('[data-count]').forEach(countOne);
  };
  window.addEventListener('beforeprint', reveal);
  off.push(() => window.removeEventListener('beforeprint', reveal));
  const later = window.setTimeout(() => {
    root.querySelectorAll('.rv:not(.in),.gbar:not(.in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) show(el);
    });
  }, 2500);
  off.push(() => window.clearTimeout(later));
  if (!calm && window.matchMedia('(hover: hover)').matches) {
    root.querySelectorAll<HTMLElement>('.tilt').forEach((card) => {
      let raf = 0;
      const move = (event: PointerEvent): void => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg) translateY(-4px)`;
        });
      };
      const leave = (): void => {
        cancelAnimationFrame(raf);
        card.style.transform = '';
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      off.push(() => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      });
    });
  }
  const ripple = (event: Event): void => {
    if (calm || !(event instanceof PointerEvent)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('.btn');
    if (!button || !root.contains(button)) return;
    const box = button.getBoundingClientRect();
    const size = Math.max(box.width, box.height);
    const ink = document.createElement('span');
    ink.className = 'rip';
    // Hors flux même sans la règle .rip de la page : sinon l’onde, carrée,
    // agrandit le bouton (flex) le temps de l’animation.
    ink.style.cssText = `position:absolute;pointer-events:none;width:${size}px;height:${size}px;left:${event.clientX - box.left - size / 2}px;top:${event.clientY - box.top - size / 2}px`;
    button.appendChild(ink);
    window.setTimeout(() => ink.remove(), 700);
  };
  document.addEventListener('pointerdown', ripple);
  off.push(() => document.removeEventListener('pointerdown', ripple));
  if (
    !calm &&
    window.matchMedia('(hover: hover) and (min-width: 900px)').matches
  ) {
    let mx = 0;
    let my = 0;
    let sy = 0;
    let raf = 0;
    const apply = (): void => {
      root.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
        const k = Number(layer.dataset.depth);
        layer.style.transform = `translate3d(${mx * k * 18}px,${my * k * 14 - sy * k * 0.12}px,0)`;
      });
      raf = 0;
    };
    const queue = (): void => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const move = (event: PointerEvent): void => {
      mx = event.clientX / window.innerWidth - 0.5;
      my = event.clientY / window.innerHeight - 0.5;
      queue();
    };
    const scroll = (): void => {
      sy = Math.min(window.scrollY, 700);
      queue();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    off.push(() => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
      cancelAnimationFrame(raf);
    });
  }
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
    const onCopy = (): void => {
      const text = button.dataset.copy ?? '';
      const done = (): void => {
        button.classList.add('ok');
        const label = button.querySelector('.bl');
        const previous = label?.textContent ?? '';
        if (label) label.textContent = t('mq.ui.copied');
        say(button.dataset.msg || t('mq.ui.copied.long'), true);
        window.setTimeout(() => {
          if (label) label.textContent = previous;
          button.classList.remove('ok');
        }, 1800);
      };
      // Jamais de « Copié » si rien n'a été copié.
      void copyText(text).then((ok) => {
        if (ok) done();
        else say(t('copy.failed'), true);
      });
    };
    button.addEventListener('click', onCopy);
    off.push(() => button.removeEventListener('click', onCopy));
  });
  const clearSk = (): void => {
    root.querySelectorAll('.sk').forEach((node) => {
      node.classList.remove('sk');
      node.removeAttribute('aria-busy');
    });
  };
  if (calm) clearSk();
  else {
    const timer = window.setTimeout(clearSk, 900);
    off.push(() => window.clearTimeout(timer));
  }
  const bar = root.querySelector<HTMLElement>('.progress');
  if (bar) {
    const onScroll = (): void => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty(
        '--p',
        max > 0 ? String(Math.min(1, window.scrollY / max)) : '0',
      );
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    off.push(() => window.removeEventListener('scroll', onScroll));
  }
  return () => {
    for (const fn of off) fn();
  };
}

export function busy(button: HTMLElement, ms: number, done?: () => void): void {
  button.setAttribute('aria-busy', 'true');
  window.setTimeout(
    () => {
      button.removeAttribute('aria-busy');
      done?.();
    },
    reduced() ? 150 : ms,
  );
}
