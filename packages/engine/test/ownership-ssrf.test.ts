import { createSafeFetch, NetError } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { probeOwnership } from '../src/index.js';

const TOKEN = 'a'.repeat(43);

const origin = {
  host: 'exemple.fr',
  scope: 'origin' as const,
  pathPrefix: null,
};

const dns = {
  query: async () => {
    throw new NetError('DNS_FAILURE', 'résolution refusée');
  },
  addresses: async () => [],
};

describe('sondes et anti-SSRF', () => {
  it('ne contacte pas une IP de métadonnées ni une adresse privée', async () => {
    let dialed = false;
    const fetch = createSafeFetch({
      resolve: async () => ['169.254.169.254'],
      dial: () => {
        dialed = true;
        return { host: '127.0.0.1', port: 9 };
      },
    });
    const meta = await probeOwnership('meta', TOKEN, origin, { fetch, dns });
    expect(meta.outcome).toBe('error');
    expect(meta.location).toBe('https://exemple.fr/');
    expect(dialed).toBe(false);

    const literal = await probeOwnership(
      'html_file',
      TOKEN,
      { host: '169.254.169.254', scope: 'origin', pathPrefix: null },
      {
        fetch: createSafeFetch({
          resolve: async () => ['1.1.1.1'],
          dial: () => {
            dialed = true;
            return { host: '127.0.0.1', port: 9 };
          },
        }),
        dns,
      },
    );
    expect(literal.outcome).toBe('error');
    expect(dialed).toBe(false);

    const privateNet = await probeOwnership('well_known', TOKEN, origin, {
      fetch: createSafeFetch({
        resolve: async () => ['10.1.2.3'],
        dial: () => {
          dialed = true;
          return { host: '127.0.0.1', port: 9 };
        },
      }),
      dns,
    });
    expect(privateNet.outcome).toBe('error');
    expect(privateNet.location).toBe(
      'https://exemple.fr/.well-known/audixio-verify.txt',
    );
    expect(dialed).toBe(false);
  });

  it('demande seulement l’URL publique de la preuve', async () => {
    const seen: string[] = [];
    const fetch = async (input: string | URL) => {
      seen.push(String(input));
      throw new NetError('BLOCKED_ADDRESS', 'test');
    };
    await probeOwnership('html_file', TOKEN, origin, { fetch, dns });
    await probeOwnership(
      'well_known',
      TOKEN,
      {
        host: 'solopaps.github.io',
        scope: 'path',
        pathPrefix: '/Projet-Site-Artiste/',
      },
      { fetch, dns },
    );
    expect(seen).toEqual([
      'https://exemple.fr/audixio-verification.html',
      'https://solopaps.github.io/.well-known/audixio-verify.txt',
    ]);
  });
});
