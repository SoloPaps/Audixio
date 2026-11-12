import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { applyLocale } from './live.js';

const FR =
  'Audixio audite un site et explique quoi corriger, en français simple.';
const EN = 'Audixio audits a site and explains what to fix, in plain language.';

function installDocument(): {
  html: { lang: string };
  description: Map<string, string>;
  og: Map<string, string>;
} {
  const description = new Map<string, string>([['content', FR]]);
  const og = new Map<string, string>([['content', 'fr_FR']]);
  const meta = (bag: Map<string, string>) => ({
    getAttribute: (key: string) => bag.get(key) ?? null,
    setAttribute: (key: string, value: string) => bag.set(key, value),
    hasAttribute: (key: string) => bag.has(key),
  });
  const html = { lang: 'fr' };
  const store = new Map<string, string>([
    ['audigy-fr', JSON.stringify({ 'meta.home.description': FR })],
    ['audigy-en', JSON.stringify({ 'meta.home.description': EN })],
  ]);
  Object.assign(globalThis, {
    NodeFilter: { SHOW_TEXT: 4 },
    location: { hash: '' },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
    document: {
      title: 'Audixio',
      documentElement: html,
      body: { querySelectorAll: () => [] },
      createTreeWalker: () => ({ nextNode: () => null }),
      getElementById: () => null,
      querySelector: (sel: string) => {
        if (sel === 'meta[name="description"]') return meta(description);
        if (sel === 'meta[property="og:description"]') return null;
        if (sel === 'meta[property="og:locale"]') return meta(og);
        return null;
      },
    },
  });
  (globalThis as { __audigy_en?: Record<string, string> }).__audigy_en = {
    'meta.home.description': EN,
  };
  return { html, description, og };
}

describe('langue du document', () => {
  afterEach(() => {
    delete (globalThis as { __audigy_en?: unknown }).__audigy_en;
  });

  it('passe html lang et les métas en anglais, puis revient au français', () => {
    const { html, description, og } = installDocument();
    applyLocale('en');
    expect(html.lang).toBe('en');
    expect(description.get('content')).toBe(EN);
    expect(og.get('content')).toBe('en_US');
    applyLocale('fr');
    expect(html.lang).toBe('fr');
    expect(description.get('content')).toBe(FR);
    expect(og.get('content')).toBe('fr_FR');
  });
});

describe('color-scheme des gabarits', () => {
  it('ne force plus le clair sur Canon ni sur la porte de connexion', () => {
    for (const file of [
      'apps/web/src/layouts/Canon.astro',
      // La porte de connexion passe par V6Page (gabarit v6).
      'apps/web/src/layouts/V6Page.astro',
    ]) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).toContain('content="light dark"');
      expect(text, file).not.toContain('content="light"');
      expect(text, file).toContain('data-dark="#06090D"');
      expect(text, file).toContain('data-light="#F3F5F8"');
      expect(text, file).toContain('property="og:locale"');
    }
    expect(
      readFileSync('apps/web/src/layouts/AuthGate.astro', 'utf8'),
    ).toContain('<V6Page');
  });
});
