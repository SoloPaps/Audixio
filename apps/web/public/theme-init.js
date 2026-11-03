(() => {
  const system = () =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', choice);
    try {
      if (localStorage.getItem('audigy-locale') !== 'en') {
        delete globalThis.__audigy_en;
        return;
      }
      const raw = localStorage.getItem('audigy-en');
      if (!raw) return;
      const pack = JSON.parse(raw);
      if (pack && typeof pack === 'object') globalThis.__audigy_en = pack;
    } catch {
      delete globalThis.__audigy_en;
    }
  };
  apply();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    let saved = null;
    try {
      saved = localStorage.getItem('audigy-theme');
    } catch {
      saved = null;
    }
    if (saved === 'light' || saved === 'dark') return;
    apply();
  });
  document.addEventListener('astro:after-swap', apply);
})();
