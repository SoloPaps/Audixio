/**
 * /methode v6 : révélations, histoire épinglée, barème à essayer, calculette, FAQ.
 * Les textes calculés (score essayé, moyenne) viennent du bloc JSON #me-i18n,
 * en FR et en EN, et sont refaits quand la langue de la page change.
 * Mouvement réduit : l’histoire se pose sur son état final, rien ne glisse.
 */

import {
  fill,
  type Grade,
  gradeOf,
  levelOf,
  overall,
  type Piece,
  STORY_RAIL,
} from './methode-v6-math.js';

type Off = () => void;
type Lines = Record<string, string>;
type Pack = { fr: Lines; en: Lines };

function all<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode,
): T[] {
  return [...root.querySelectorAll<T>(sel)];
}

function one<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode,
): T {
  const found = root.querySelector<T>(sel);
  if (!found) throw new Error(`methode : ${sel} absent`);
  return found;
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

/** Écrit des morceaux (texte, gras) sans innerHTML. */
function paint(el: Element, pieces: Piece[]): void {
  const next = pieces
    .map((p) => (p.bold ? `<b>${p.text}</b>` : p.text))
    .join('');
  if (el.getAttribute('data-painted') === next) return;
  el.replaceChildren(
    ...pieces.map((p) => {
      if (!p.bold) return document.createTextNode(p.text);
      const b = document.createElement('b');
      b.textContent = p.text;
      return b;
    }),
  );
  el.setAttribute('data-painted', next);
}

function setText(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

class Words {
  constructor(private readonly pack: Pack) {}
  get locale(): 'fr' | 'en' {
    return document.documentElement.lang === 'en' ? 'en' : 'fr';
  }
  line(key: string): string {
    return this.pack[this.locale][key] ?? this.pack.fr[key] ?? '';
  }
  level(grade: Grade): string {
    return this.line(`me.js.l.${levelOf(grade)}`);
  }
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
    { threshold: 0.12 },
  );
  for (const el of els) io.observe(el);
  return () => io.disconnect();
}

/** Histoire : la scène épinglée suit l’étape lue ; sinon, état final statique. */
function initStory(
  root: HTMLElement,
  el: HTMLElement,
  reduce: MediaQueryList,
): Off {
  const stage = one('[data-stage]', el);
  const wrap = one('.stage-w', el);
  const beats = all('.beat', el);
  const rail = all('[data-r]', el);
  let cur = -1;
  let offs: Off[] = [];
  const set = (i: number): void => {
    if (i === cur) return;
    cur = i;
    stage.dataset.s = String(i);
    const step = STORY_RAIL[i] ?? 0;
    beats.forEach((b, j) => {
      b.classList.toggle('on', j === i);
    });
    rail.forEach((r, j) => {
      r.classList.toggle('on', j === step);
      r.classList.toggle('done', j < step);
    });
  };
  const line = (): number => {
    const vh = window.innerHeight;
    if (window.innerWidth >= 960) return vh * 0.5;
    const bottom = wrap.getBoundingClientRect().bottom;
    return bottom + (vh - bottom) * 0.45;
  };
  const pick = (): void => {
    const l = line();
    let best = Number.POSITIVE_INFINITY;
    let at = 0;
    beats.forEach((b, j) => {
      const r = b.getBoundingClientRect();
      const gap = Math.abs(r.top + r.height / 2 - l);
      if (gap < best) {
        best = gap;
        at = j;
      }
    });
    set(at);
  };
  const start = (): void => {
    // Premier état posé sans fondu : la scène finale (rendu serveur) ne
    // s’efface pas sous les yeux, et rien n’est lu à mi-transition.
    el.classList.add('snap');
    root.classList.add('mo');
    pick();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.remove('snap')),
    );
    offs.push(onScroll(pick));
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries)
        el.classList.toggle('idle', !entry.isIntersecting);
    });
    io.observe(el);
    offs.push(() => io.disconnect());
  };
  const stop = (): void => {
    for (const off of offs) off();
    offs = [];
    root.classList.remove('mo');
    el.classList.remove('idle');
    cur = -1;
    stage.dataset.s = String(beats.length - 1);
    for (const b of beats) b.classList.remove('on');
    for (const r of rail) r.classList.remove('on', 'done');
  };
  if (!reduce.matches && 'IntersectionObserver' in window) start();
  const change = (): void => {
    if (reduce.matches) stop();
    else if (!root.classList.contains('mo')) start();
  };
  reduce.addEventListener('change', change);
  return () => {
    reduce.removeEventListener('change', change);
    stop();
  };
}

/** Barème : le curseur déplace le repère, éclaire la lettre et la ligne du tableau. */
function initScale(el: HTMLElement, words: Words, hooks: (() => void)[]): Off {
  const range = one<HTMLInputElement>('[data-try]', el);
  const out = one('[data-try-out]', el);
  const pin = one('[data-pin]', el);
  const segs = all('.sg', el);
  const rows = all('.gt tr[data-g]', el.closest('section') ?? el);
  const update = (): void => {
    const score = Number(range.value);
    const grade = gradeOf(score);
    pin.style.setProperty('--p', String(score));
    setText(pin, String(score));
    for (const s of segs)
      s.classList.toggle('on', s.classList.contains(`g-${grade}`));
    for (const r of rows) r.classList.toggle('on', r.dataset.g === grade);
    paint(
      out,
      fill(
        words.line('me.js.try.out'),
        { n: score, g: grade, l: words.level(grade).toLowerCase() },
        ['g'],
      ),
    );
    range.setAttribute('aria-valuetext', `${score}, ${grade}`);
  };
  update();
  hooks.push(update);
  return on(range, 'input', update);
}

/** Calculette : moyenne à poids égaux des domaines comptés. */
function initCalc(el: HTMLElement, words: Words, hooks: (() => void)[]): Off {
  const buttons = all<HTMLButtonElement>('.calc button', el);
  const res = one('[data-calc-res]', el);
  const chip = one('[data-calc-g]', el);
  const live = one('[data-calc-live]', el);
  const update = (announce: boolean): void => {
    const values: number[] = [];
    for (const b of buttons) {
      const pressed = b.getAttribute('aria-pressed') === 'true';
      if (pressed) values.push(Number(b.dataset.v));
      setText(
        one('b', b),
        pressed ? (b.dataset.v ?? '') : words.line('me.js.calc.off'),
      );
    }
    const avg = overall(values);
    if (avg === null) {
      setText(res, words.line('me.js.calc.none'));
      res.removeAttribute('data-painted');
      chip.hidden = true;
      if (announce) setText(live, words.line('me.js.calc.livent'));
      return;
    }
    const grade = gradeOf(avg);
    paint(
      res,
      fill(
        words.line('me.js.calc.res'),
        { sum: values.join(' + '), n: values.length, avg },
        ['avg'],
      ),
    );
    chip.hidden = false;
    setText(chip, grade);
    chip.className = `g g-${grade}`;
    if (announce)
      setText(
        live,
        fill(words.line('me.js.calc.live'), {
          avg,
          g: `${grade}, ${words.level(grade).toLowerCase()}`,
        })
          .map((p) => p.text)
          .join(''),
      );
  };
  const offs = buttons.map((b) =>
    on(b, 'click', () => {
      b.setAttribute(
        'aria-pressed',
        b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true',
      );
      update(true);
    }),
  );
  update(false);
  hooks.push(() => update(false));
  return () => {
    for (const off of offs) off();
  };
}

/** FAQ : Échap referme la question ouverte et rend le focus à son titre. */
function initFaq(el: HTMLElement): Off {
  const items = all<HTMLDetailsElement>('details', el);
  return on(el, 'keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = items.find(
      (d) => d.open && d.contains(document.activeElement),
    );
    if (!open) return;
    open.open = false;
    one('summary', open).focus();
  });
}

function readPack(): Pack {
  const node = document.getElementById('me-i18n');
  const raw = node?.textContent ?? '';
  const pack = JSON.parse(raw || '{"fr":{},"en":{}}') as Pack;
  return pack;
}

export function bootMethode(root: HTMLElement): Off {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const words = new Words(readPack());
  const hooks: (() => void)[] = [];
  const offs: Off[] = [];
  const safe = (
    el: HTMLElement | null,
    init: (el: HTMLElement) => Off,
  ): void => {
    if (!el) return;
    try {
      offs.push(init(el));
    } catch {
      // Une section qui échoue reste dans son état statique, lisible.
      el.classList.add('static');
    }
  };
  offs.push(initReveal(root, reduce.matches));
  safe(root.querySelector('[data-component="Story"]'), (el) =>
    initStory(root, el, reduce),
  );
  safe(root.querySelector('[data-component="GradeScale"]'), (el) =>
    initScale(el, words, hooks),
  );
  safe(root.querySelector('[data-component="Calc"]'), (el) =>
    initCalc(el, words, hooks),
  );
  safe(root.querySelector('[data-component="Faq"]'), initFaq);
  // La bascule FR|EN change html[lang] : les textes calculés suivent.
  let lang = document.documentElement.lang;
  const mo = new MutationObserver(() => {
    if (document.documentElement.lang === lang) return;
    lang = document.documentElement.lang;
    for (const hook of hooks) hook();
  });
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  return () => {
    mo.disconnect();
    for (const off of offs) off();
  };
}
