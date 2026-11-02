/** Mouvements communs des vues portées des maquettes finales. */

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
