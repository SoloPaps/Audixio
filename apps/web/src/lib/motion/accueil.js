(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function anim(dur, fn) {
    return new Promise((res) => {
      if (reduce) {
        fn(1);
        res();
        return;
      }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        fn(p);
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }

  /* ============================================================
     SAFETY NET : si quoique ce soit plante, tout devient visible
     ============================================================ */
  function revealEverything() {
    $$('.rv, .rv-x, .rv-xr, .rv-s').forEach((el) => {
      el.classList.add('in');
    });
    $$('.find').forEach((f) => {
      f.style.opacity = '1';
      f.style.transform = 'none';
    });
    $$('#rows .row').forEach((r) => {
      r.classList.add('done');
    });
    const gv = document.getElementById('g-val');
    if (gv) gv.style.opacity = '1';
    const gp = document.getElementById('g-prog');
    if (gp) gp.style.strokeDashoffset = 2 * Math.PI * 50 * (1 - 54 / 100);
  }
  setTimeout(revealEverything, 3500);
  window.addEventListener('error', revealEverything, { once: true });

  /* ============================================================
     1) RÉVÉLATIONS — en PREMIER, pour que tout le reste en dépend
     ============================================================ */
  function initReveal() {
    const rv = $$('.rv, .rv-x, .rv-xr, .rv-s');
    if (!document.documentElement.classList.contains('js')) {
      rv.forEach((el) => {
        el.classList.add('in');
      });
      return;
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('in');
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
      );
      rv.forEach((el) => {
        io.observe(el);
      });
    } else {
      rv.forEach((el) => {
        el.classList.add('in');
      });
    }
  }

  /* ============================================================
     2) CURSEUR
     ============================================================ */
  function initCursor() {
    if (reduce) return;
    if (!matchMedia('(hover:hover) and (min-width:769px)').matches) return;
    const dot = $('#c-dot'),
      ring = $('#c-ring');
    if (!dot || !ring) return;
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      requestAnimationFrame(loop);
    })();
    $$(
      'a,button,input,summary,.plan,.pledge,.tab,.chips li,.find,.window',
    ).forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('hov'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hov'));
    });
  }

  /* ============================================================
     3) BARRE DE PROGRESSION
     ============================================================ */
  function initProgress() {
    const prog = $('#prog');
    if (!prog) return;
    addEventListener(
      'scroll',
      () => {
        const h = document.documentElement.scrollHeight - innerHeight;
        if (h > 0) prog.style.width = (scrollY / h) * 100 + '%';
      },
      { passive: true },
    );
  }

  /* ============================================================
     4) CANVAS GLOBAL : étoiles + constellations
     ============================================================ */
  function initBgCanvas() {
    if (reduce) return;
    const cv = $('#bg-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let W,
      H,
      dpr = Math.min(devicePixelRatio || 1, 2);
    const stars = [],
      N = 55;
    function resize() {
      W = cv.width = innerWidth * dpr;
      H = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
    }
    resize();
    addEventListener('resize', resize);
    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (Math.random() * 1.4 + 0.4) * dpr,
        vx: (Math.random() - 0.5) * 0.18 * dpr,
        vy: (Math.random() - 0.5) * 0.18 * dpr,
        a: Math.random() * 0.45 + 0.25,
        tw: Math.random() * Math.PI * 2,
      });
    }
    let t = 0;
    function draw() {
      t += 0.01;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H;
        if (s.y > H) s.y = 0;
        const a = s.a * (0.55 + 0.45 * Math.sin(t * 3 + s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(112,145,230,${a})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(173,187,218,${a * 0.22})`;
        ctx.fill();
      }
      const DIST = 130 * dpr;
      for (let i = 0; i < stars.length; i++)
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x,
            dy = stars[i].y - stars[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < DIST * DIST) {
            const o = 1 - Math.sqrt(d2) / DIST;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(112,145,230,${o * 0.15})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ============================================================
     5) RADAR DU HÉROS
     ============================================================ */
  function initRadar() {
    if (reduce) return;
    const cv = $('#stage-canvas');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    let W = 0,
      H = 0,
      dpr = Math.min(devicePixelRatio || 1, 2);
    function resize() {
      const r = cv.getBoundingClientRect();
      W = r.width * dpr;
      H = r.height * dpr;
      cv.width = W;
      cv.height = H;
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv);
    else addEventListener('resize', resize);

    const nodes = [
      { a: 0.5, d: 0.6 },
      { a: 1.6, d: 0.75 },
      { a: 2.4, d: 0.55 },
      { a: 3.4, d: 0.7 },
      { a: 4.2, d: 0.8 },
      { a: 5.1, d: 0.65 },
      { a: 5.8, d: 0.5 },
    ];
    let ang = 0;
    function draw() {
      const w = W,
        h = H,
        cxx = w * 0.5,
        cyy = h * 0.42;
      const r = Math.min(w, h) * 0.7;
      ctx.clearRect(0, 0, w, h);

      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(cxx, cyy, r * (k / 3), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(112,145,230,${0.15 - k * 0.03})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(cxx, cyy);
        ctx.lineTo(cxx + Math.cos(a) * r, cyy + Math.sin(a) * r);
        ctx.strokeStyle = 'rgba(112,145,230,0.06)';
        ctx.stroke();
      }

      const head = ang - Math.PI / 2;
      const trail = 1.4;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cxx, cyy, r, 0, Math.PI * 2);
      ctx.clip();
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(head - trail, cxx, cyy);
        const frac = trail / (Math.PI * 2);
        g.addColorStop(0, 'rgba(112,145,230,0)');
        g.addColorStop(frac * 0.55, 'rgba(112,145,230,0.10)');
        g.addColorStop(frac, 'rgba(112,145,230,0.42)');
        g.addColorStop(frac + 0.002, 'rgba(112,145,230,0)');
        g.addColorStop(1, 'rgba(112,145,230,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      const hx = cxx + Math.cos(head) * r,
        hy = cyy + Math.sin(head) * r;
      const lg = ctx.createLinearGradient(cxx, cyy, hx, hy);
      lg.addColorStop(0, 'rgba(61,82,160,0)');
      lg.addColorStop(1, 'rgba(61,82,160,0.7)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(cxx, cyy);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      for (const nd of nodes) {
        const nx = cxx + Math.cos(nd.a) * r * nd.d;
        const ny = cyy + Math.sin(nd.a) * r * nd.d;
        const delta =
          (((ang - nd.a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const k = Math.max(0, 1 - delta / (Math.PI * 2 * 0.75));
        const gl = ctx.createRadialGradient(nx, ny, 0, nx, ny, 22 * dpr);
        gl.addColorStop(0, `rgba(112,145,230,${0.55 * k})`);
        gl.addColorStop(1, 'rgba(112,145,230,0)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(nx, ny, 22 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(nx, ny, 4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(61,82,160,${0.4 + 0.6 * k})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(112,145,230,${k * 0.6})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
      }

      ang = (ang + 0.004) % (Math.PI * 2);
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ============================================================
     6) MENU + HEADER
     ============================================================ */
  function initHeader() {
    const menuBtn = $('#menu-btn'),
      nav = $('#nav'),
      header = $('.site-header');
    if (!menuBtn || !nav || !header) return;
    const setMenu = (open) => {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute(
        'aria-label',
        open ? 'Fermer le menu' : 'Ouvrir le menu',
      );
    };
    menuBtn.addEventListener('click', () =>
      setMenu(!nav.classList.contains('open')),
    );
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const field = $('#audit-field');
    if (field && 'IntersectionObserver' in window) {
      new IntersectionObserver(
        (en) => {
          document.body.classList.toggle(
            'show-cta',
            !en[0].isIntersecting && en[0].boundingClientRect.top < 0,
          );
        },
        { threshold: 0 },
      ).observe(field);
    }
  }

  /* ============================================================
     7) ECG
     ============================================================ */
  function initEcg() {
    if (reduce) return;
    const ecg = $('#ecg-path');
    if (!ecg) return;
    const L = ecg.getTotalLength();
    ecg.style.strokeDasharray = L;
    ecg.style.strokeDashoffset = L;
    wait(700).then(() =>
      anim(2800, (p) => {
        ecg.style.strokeDashoffset = L * (1 - ease(p));
      }),
    );
  }

  /* ============================================================
     8) TILT DE LA FENÊTRE AU SCROLL
     ============================================================ */
  function initWindowTilt() {
    if (reduce) return;
    const win = $('#window');
    if (!win) return;
    let ticking = false;
    const tilt = () => {
      const r = win.getBoundingClientRect(),
        vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 1.0 - r.top) / (vh * 0.66)));
      win.style.setProperty('--tilt', (9 * (1 - p)).toFixed(2) + 'deg');
      win.style.setProperty('--ty', (28 * (1 - p)).toFixed(1) + 'px');
      ticking = false;
    };
    const req = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(tilt);
      }
    };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    tilt();
  }

  /* ============================================================
     9) RAPPORT : analyse séquentielle
     ============================================================ */
  function initReport() {
    const gProg = $('#g-prog'),
      gVal = $('#g-val');
    if (!gProg || !gVal) return;
    const C = 2 * Math.PI * 50,
      TARGET = 54;
    const setGauge = (v) => {
      gProg.style.strokeDashoffset = C * (1 - v / 100);
    };
    const rows = $$('#rows .row'),
      finds = $$('#finds .find');
    const sub = $('#win-sub');
    const names = rows.map((r) => $('.r-name', r).textContent);
    const SUB_DEFAULT = sub ? sub.textContent : '';

    function resetReport() {
      rows.forEach((r) => {
        r.classList.remove('done', 'active');
      });
      setGauge(0);
      gVal.style.opacity = 0;
      if (!reduce)
        finds.forEach((f) => {
          f.style.transition = 'none';
          f.style.opacity = 0;
          f.style.transform = 'translateY(8px)';
        });
    }

    async function playReport(opts = {}) {
      const step = opts.fast ? 150 : 230;
      resetReport();
      await wait(reduce ? 0 : 350);
      for (let i = 0; i < rows.length; i++) {
        rows[i].classList.add('active');
        if (sub) sub.textContent = 'Lecture passive : ' + names[i] + '…';
        await wait(reduce ? 0 : step);
        rows[i].classList.add('done');
        await wait(reduce ? 0 : step * 0.55);
        rows[i].classList.remove('active');
      }
      if (sub) sub.textContent = opts.finalText || SUB_DEFAULT;
      await anim(1200, (p) => setGauge(TARGET * ease(p)));
      gVal.style.opacity = 1;
      for (const f of finds) {
        f.style.transition = 'opacity .6s, transform .6s';
        f.style.opacity = 1;
        f.style.transform = 'none';
        await wait(reduce ? 0 : 160);
      }
    }

    if (reduce) {
      setGauge(TARGET);
      gVal.style.opacity = 1;
      finds.forEach((f) => {
        f.style.opacity = 1;
        f.style.transform = 'none';
      });
      rows.forEach((r) => {
        r.classList.add('done');
      });
    } else {
      if (sub) sub.textContent = ' ';
      wait(1000)
        .then(() => playReport({ fast: true }))
        .catch(() => revealEverything());
    }
  }

  /* ============================================================
     10) ONGLETS DOMAINES
     ============================================================ */
  function initTabs() {
    const tablist = $('#tablist');
    if (!tablist) return;
    const tabs = $$('.tab', tablist);
    const panels = $$('.panel');

    function selectTab(i, focus) {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, k) => {
        p.hidden = k !== i;
        p.classList.remove('enter');
        if (k === i && !reduce) {
          void p.offsetWidth;
          p.classList.add('enter');
        }
      });
      if (focus) tabs[i].focus();
      if (matchMedia('(max-width:1000px)').matches) {
        tabs[i].scrollIntoView({
          block: 'nearest',
          inline: 'center',
          behavior: reduce ? 'auto' : 'smooth',
        });
      }
    }
    panels.forEach((p, k) => {
      p.hidden = k !== 0;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(i, false));
    });
    tablist.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const horiz = matchMedia('(max-width:1000px)').matches;
      const next = horiz ? 'ArrowRight' : 'ArrowDown';
      const prev = horiz ? 'ArrowLeft' : 'ArrowUp';
      let j = null;
      if (e.key === next || e.key === (horiz ? 'ArrowDown' : 'ArrowRight'))
        j = (i + 1) % tabs.length;
      else if (e.key === prev || e.key === (horiz ? 'ArrowUp' : 'ArrowLeft'))
        j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) {
        e.preventDefault();
        selectTab(j, true);
      }
    });
  }

  /* ============================================================
     11) FORMULAIRE
     ============================================================ */
  function initForm() {
    const form = $('#audit-form'),
      input = $('#url-input'),
      errEl = $('#url-error'),
      btn = $('#audit-btn');
    if (!form || !input || !btn) return;
    const repSite = $('#rep-site'),
      urlSite = $('#url-site'),
      tagEl = $('#rep-tag'),
      live = $('#scan-status');
    const busy = false;

    function normalize(v) {
      v = v.trim();
      if (!v || /\s/.test(v)) return null;
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
      try {
        const u = new URL(v);
        if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.'))
          return null;
        return u;
      } catch (e) {
        return null;
      }
    }

    form.addEventListener('submit', () => {
      if (busy) return;
      return;
    });

    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid')) {
        input.removeAttribute('aria-invalid');
        if (errEl) errEl.textContent = '';
      }
    });

    const field = $('#audit-field');
    $$('.js-focus-input').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (field) {
          field.scrollIntoView({
            behavior: reduce ? 'auto' : 'smooth',
            block: 'center',
          });
          setTimeout(
            () => input.focus({ preventScroll: true }),
            reduce ? 0 : 550,
          );
          field.classList.remove('ping');
          void field.offsetWidth;
          field.classList.add('ping');
        }
      });
    });
  }

  /* ============================================================
     12) RIPPLE
     ============================================================ */
  function initRipple() {
    if (reduce) return;
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.btn');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const s = Math.max(r.width, r.height);
      const rip = document.createElement('span');
      rip.className = 'rip';
      rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      b.appendChild(rip);
      setTimeout(() => rip.remove(), 750);
    });
  }

  /* ============================================================
     BOOTSTRAP — chaque section dans son propre try/catch
     ============================================================ */
  const sections = [
    ['reveal', initReveal],
    ['cursor', initCursor],
    ['progress', initProgress],
    ['bgCanvas', initBgCanvas],
    ['radar', initRadar],
    ['ecg', initEcg],
    ['windowTilt', initWindowTilt],
    ['report', initReport],
    ['tabs', initTabs],
    ['form', initForm],
    ['ripple', initRipple],
  ];
  for (const [name, fn] of sections) {
    try {
      fn();
    } catch (err) {
      console.error('[Audixio] section "' + name + '" a échoué :', err);
      // On continue : une section cassée ne doit pas bloquer les autres
    }
  }
})();
