(() => {
  const system = () =>
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  // Même règle que enPackUsable (apps/web/src/i18n/en-pack.ts).
  function enPackUsable(pack) {
    if (!pack || typeof pack !== 'object') return false;
    const password = pack['login.password'];
    const submit = pack['login.submit'];
    const lead = pack['login.lead'];
    if (typeof password !== 'string' || password.length === 0) return false;
    if (typeof submit !== 'string' || submit.length === 0) return false;
    if (submit === 'Send the link') return false;
    if (
      typeof lead === 'string' &&
      lead.toLowerCase().includes('no password')
    ) {
      return false;
    }
    return true;
  }

  const apply = () => {
    const root = document.documentElement;
    const query = new URLSearchParams(location.search).get('theme');
    let saved = null;
    try {
      saved = localStorage.getItem('audigy-theme');
    } catch {
      saved = null;
    }
    const choice =
      query === 'light' || query === 'dark'
        ? query
        : saved === 'light' || saved === 'dark'
          ? saved
          : system();
    root.setAttribute('data-theme', choice);
    const meta =
      typeof document.querySelector === 'function'
        ? document.querySelector('meta[name="color-scheme"]')
        : null;
    if (meta) meta.setAttribute('content', choice);
    const bar =
      typeof document.querySelector === 'function'
        ? document.querySelector('meta[name="theme-color"]')
        : null;
    if (bar) {
      const ink = bar.getAttribute(
        choice === 'dark' ? 'data-dark' : 'data-light',
      );
      if (ink) bar.setAttribute('content', ink);
    }
    let locale = 'fr';
    try {
      if (localStorage.getItem('audigy-locale') !== 'en') {
        delete globalThis.__audigy_en;
        root.setAttribute('lang', locale);
        return;
      }
      locale = 'en';
      const raw = localStorage.getItem('audigy-en');
      const pack = raw ? JSON.parse(raw) : null;
      if (!enPackUsable(pack)) {
        localStorage.removeItem('audigy-en');
        localStorage.setItem('audigy-locale', 'fr');
        delete globalThis.__audigy_en;
        locale = 'fr';
        root.setAttribute('lang', locale);
        return;
      }
      globalThis.__audigy_en = pack;
    } catch {
      try {
        localStorage.removeItem('audigy-en');
        localStorage.setItem('audigy-locale', 'fr');
      } catch {
        /* stockage indisponible */
      }
      delete globalThis.__audigy_en;
      locale = 'fr';
    }
    root.setAttribute('lang', locale);
  };
  apply();
  if (typeof matchMedia === 'function')
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change',
      () => {
        let saved = null;
        try {
          saved = localStorage.getItem('audigy-theme');
        } catch {
          saved = null;
        }
        if (saved === 'light' || saved === 'dark') return;
        apply();
      },
    );
  document.addEventListener('astro:after-swap', apply);
})();
