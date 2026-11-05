import { afterEach, describe, expect, it, vi } from 'vitest';

const etat = vi.hoisted(() => ({ configured: false }));

vi.mock('./public-config.js', () => ({
  authConfigured: () => etat.configured,
}));

import { AUTH_STORAGE_KEY, storedSessionPresent } from './auth-storage.js';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  etat.configured = false;
});

function installer(): void {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
  });
}

describe('storedSessionPresent', () => {
  it('reste faux sans configuration', () => {
    installer();
    store.set(AUTH_STORAGE_KEY, JSON.stringify({ access_token: 'jeton' }));
    expect(storedSessionPresent()).toBe(false);
  });

  it('lit une session encore valable', () => {
    installer();
    etat.configured = true;
    store.set(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access_token: 'jeton', expires_at: 2_000_000_000 }),
    );
    expect(storedSessionPresent()).toBe(true);
  });

  it('ignore un jeton expiré, vide ou illisible', () => {
    installer();
    etat.configured = true;
    store.set(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access_token: 'jeton', expires_at: 1 }),
    );
    expect(storedSessionPresent()).toBe(false);
    store.set(AUTH_STORAGE_KEY, JSON.stringify({ access_token: '' }));
    expect(storedSessionPresent()).toBe(false);
    store.set(AUTH_STORAGE_KEY, '{');
    expect(storedSessionPresent()).toBe(false);
  });

  it('reconnaît la session par cookie sans jeton localStorage (C1)', () => {
    installer();
    etat.configured = true;
    vi.stubGlobal('document', {
      cookie: 'sb-127-auth-token=base64-eyJ4IjoxfQ; audixio_connecte=1',
    });
    expect(storedSessionPresent()).toBe(true);
    vi.stubGlobal('document', {
      cookie: 'sb-127-auth-token=base64-eyJ4IjoxfQ',
    });
    expect(storedSessionPresent()).toBe(false);
    vi.unstubAllGlobals();
  });
});
