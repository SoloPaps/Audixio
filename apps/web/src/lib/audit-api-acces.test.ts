import { afterEach, describe, expect, it, vi } from 'vitest';
import { readAudit } from './audit-api.js';

// Retest C6 : l’audit d’un autre compte (ou inconnu) ne doit plus afficher
// « La demande est incomplète. Vérifiez l’adresse. ».

const OTHER = '00000000-0000-4000-8000-0000000000b5';
const UNAVAILABLE = 'Rapport introuvable ou réservé à son propriétaire.';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
}

describe('lecture d’un audit inaccessible', () => {
  for (const [status, error] of [
    [400, 'invalid_input'],
    [403, 'forbidden'],
    [404, 'audit_not_found'],
  ] as const) {
    it(`${status} sur un identifiant valide : introuvable ou réservé`, async () => {
      stub(status, { error, messageKey: `api.error.${error}` });
      const result = await readAudit('jeton', OTHER);
      expect(result).toEqual({ ok: false, status: 404, message: UNAVAILABLE });
    });
  }

  it('identifiant mal formé : le 400 garde son message', async () => {
    stub(400, {
      error: 'invalid_input',
      messageKey: 'api.error.invalid_input',
    });
    const result = await readAudit('jeton', 'pas-un-uuid');
    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'La demande est incomplète. Vérifiez l’adresse.',
    });
  });

  it('les autres erreurs ne changent pas', async () => {
    stub(500, { error: 'internal', messageKey: 'api.error.internal' });
    const result = await readAudit('jeton', OTHER);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.message).not.toBe(UNAVAILABLE);
    }
  });
});
