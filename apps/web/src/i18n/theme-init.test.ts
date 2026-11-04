import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('../../public/theme-init.js', import.meta.url)),
  'utf8',
);

const current = readFileSync(
  fileURLToPath(new URL('../../public/dictionnaire-en.json', import.meta.url)),
  'utf8',
);

function boot(initial: Record<string, string>): {
  store: Map<string, string>;
  host: Record<string, unknown>;
} {
  const store = new Map(Object.entries(initial));
  const sandbox: Record<string, unknown> = {
    document: {
      documentElement: {
        setAttribute() {
          return undefined;
        },
        removeAttribute() {
          return undefined;
        },
      },
      addEventListener() {
        return undefined;
      },
    },
    URLSearchParams,
    JSON,
    location: { search: '' },
    localStorage: {
      getItem(key: string) {
        return store.has(key) ? (store.get(key) ?? null) : null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    },
  };
  runInNewContext(source, sandbox);
  return { store, host: sandbox };
}

describe('démarrage de la langue', () => {
  it('oublie un dictionnaire de lien magique et revient au français', () => {
    const stale = JSON.stringify({
      'login.lead': 'Enter your email. We send a link, with no password.',
      'login.email': 'Email address',
      'login.submit': 'Send the link',
      'footer.privacy': 'Privacy',
    });
    const { store, host } = boot({
      'audigy-locale': 'en',
      'audigy-en': stale,
    });
    expect(host.__audigy_en).toBeUndefined();
    expect(store.get('audigy-locale')).toBe('fr');
    expect(store.has('audigy-en')).toBe(false);
  });

  it('pose le dictionnaire anglais actuel', () => {
    const { store, host } = boot({
      'audigy-locale': 'en',
      'audigy-en': current,
    });
    const pack = host.__audigy_en as Record<string, string>;
    expect(pack['login.submit']).toBe('Sign in');
    expect(pack['login.password']).toBe('Password');
    expect(store.get('audigy-locale')).toBe('en');
  });

  it('laisse le français sans dictionnaire', () => {
    const { host } = boot({});
    expect(host.__audigy_en).toBeUndefined();
  });
});
