import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestBriefExport } from './brief-fetch.js';

const AUDIT = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub(
  status: number,
  body: string,
  headers: Record<string, string> = {},
) {
  const fetchMock = vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) => {
      return new Response(body, { status, headers });
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('demande d’export du brief', () => {
  it('envoie la sélection sans titre et lit le fichier serveur', async () => {
    const fetchMock = stub(
      200,
      'Audixio Brief — PARTIEL (Site non vérifié)\n\ncorps\n',
      {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition':
          'attachment; filename="audixio-prompt-remediation.md"',
      },
    );
    const file = await requestBriefExport(AUDIT, 'jeton-test', [
      { checkId: 'performance.lcp', mode: 'fix' },
    ]);
    expect(file).toEqual({
      ok: true,
      filename: 'audixio-prompt-remediation.md',
      markdown: 'Audixio Brief — PARTIEL (Site non vérifié)\n\ncorps\n',
    });
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`/api/audits/${AUDIT}/brief`);
    const init = call?.[1];
    if (!init) throw new Error('appel sans options');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer jeton-test',
    );
    expect(JSON.parse(String(init.body))).toEqual({
      selection: [{ checkId: 'performance.lcp', mode: 'fix' }],
    });
  });

  it('refuse l’accès sans rendre le corps technique', async () => {
    stub(
      401,
      JSON.stringify({
        error: 'unauthorized',
        messageKey: 'api.error.unauthorized',
        detail: 'FUITE-CLIENT-HSTS',
      }),
    );
    const file = await requestBriefExport(AUDIT, 'jeton-test', []);
    expect(file.ok).toBe(false);
    if (!file.ok) {
      expect(file.message).toBe('Connectez-vous pour lancer ou lire un audit.');
      expect(file.message).not.toContain('FUITE');
    }
  });

  it('traduit le refus de brief', async () => {
    stub(
      403,
      JSON.stringify({
        error: 'forbidden',
        messageKey: 'api.error.forbidden',
      }),
    );
    const file = await requestBriefExport(AUDIT, 'jeton-test', []);
    expect(file).toEqual({
      ok: false,
      message: 'Ce brief n’est pas disponible pour ce rapport.',
    });
  });

  it('ne fabrique pas de fichier si le réseau échoue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const file = await requestBriefExport(AUDIT, 'jeton-test', []);
    expect(file).toEqual({
      ok: false,
      message:
        'Le service ne répond pas pour le moment. Réessayez dans quelques minutes.',
    });
  });
});
