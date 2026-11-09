import { describe, expect, it } from 'vitest';
import {
  type AccountDeps,
  type ApiDeps,
  type BriefExportDeps,
  handleAccount,
  handleBriefExport,
  handleCreate,
  handleCreateVerification,
  handleGet,
  handleGuestCreate,
  handleLien,
  handlePartage,
  handlePlaces,
  type LienDeps,
  type PlacesDeps,
  type VerificationDeps,
} from '../src/index.js';
import { captureLogger } from './helpers.js';

const AUDIT = '00000000-0000-4000-8000-000000000099';

function json(method: string, url: string, body?: unknown): Request {
  const init: RequestInit = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

async function status(
  res: Response,
): Promise<{ status: number; error?: string }> {
  const body = (await res.json()) as { error?: string };
  return body.error === undefined
    ? { status: res.status }
    : { status: res.status, error: body.error };
}

describe('API matrice des droits : visiteur sans jeton', () => {
  it('refuse les endpoints de compte, d’audit, de brief, de liens, de lieux et de preuve', async () => {
    const { logger } = captureLogger([]);
    const api: ApiDeps = {
      logger,
      userFromToken: async () => null,
      createDeps: () => {
        throw new Error('createDeps ne doit pas être appelé sans jeton');
      },
      readAudit: async () => {
        throw new Error('readAudit ne doit pas être appelé sans jeton');
      },
    };
    const account: AccountDeps = {
      logger,
      userFromToken: async () => null,
      gateway: () => {
        throw new Error('gateway ne doit pas être appelé sans jeton');
      },
    };
    const liens: LienDeps = {
      logger,
      userFromToken: async () => null,
      store: {} as LienDeps['store'],
    };
    const places: PlacesDeps = {
      logger,
      enabled: true,
      userFromToken: async () => null,
      ownsSite: async () => false,
      allow: async () => true,
      listPlaces: async () => [],
      search: async () => [],
      confirm: async () => 'error',
      clear: async () => {},
    };
    const brief: BriefExportDeps = {
      logger,
      userFromToken: async () => null,
      readAudit: async () => null,
      viewerFor: () => ({ kind: 'anon' }),
      label: () => ({ title: '', proof: '' }),
      render: () => '',
    };
    const verify = {
      logger,
      userFromToken: async () => null,
    } as unknown as VerificationDeps;

    const denied = [
      handleCreate(
        json('POST', 'http://localhost/api/audits', { url: 'exemple.fr' }),
        api,
      ),
      handleGet(
        json('GET', `http://localhost/api/audits/${AUDIT}`),
        api,
        AUDIT,
      ),
      handleBriefExport(
        json('GET', `http://localhost/api/audits/${AUDIT}/brief`),
        brief,
        AUDIT,
      ),
      handleAccount(
        json('GET', 'http://localhost/api/compte/export'),
        account,
        'export',
      ),
      handleAccount(
        json('POST', 'http://localhost/api/compte/cgu', { version: '2026.1' }),
        account,
        'cgu',
      ),
      handleAccount(
        json('POST', 'http://localhost/api/compte/suppression', {
          confirm: 'supprimer',
        }),
        account,
        'suppression',
      ),
      handleLien(
        json('GET', `http://localhost/api/liens?auditId=${AUDIT}`),
        liens,
      ),
      handleLien(
        json('POST', 'http://localhost/api/liens', {
          auditId: AUDIT,
          kind: 'public',
        }),
        liens,
      ),
      handleLien(
        json('DELETE', 'http://localhost/api/liens', { id: AUDIT }),
        liens,
      ),
      handlePlaces(json('GET', 'http://localhost/api/places'), places),
      handleCreateVerification(
        json('POST', 'http://localhost/api/verifications', {}),
        verify,
      ),
    ];

    const results = await Promise.all(denied);
    for (const res of results) {
      expect(await status(res)).toEqual({
        status: 401,
        error: 'unauthorized',
      });
    }
  });

  it('laisse POST /api/partage lisible sans compte (jeton manquant → absent, pas 401)', async () => {
    const { logger } = captureLogger([]);
    const liens: LienDeps = {
      logger,
      userFromToken: async () => null,
      store: {} as LienDeps['store'],
    };
    const res = await handlePartage(
      json('POST', 'http://localhost/api/partage', { token: 'invalide' }),
      liens,
    );
    expect(await status(res)).toEqual({ status: 404, error: 'absent' });
  });

  it('accepte POST /api/guest-audits sans jeton (429 au plafond, jamais 401)', async () => {
    const { logger } = captureLogger([]);
    const api: ApiDeps = {
      logger,
      userFromToken: async () => null,
      createDeps: () => {
        throw new Error('createDeps');
      },
      readAudit: async () => null,
      guardGuest: async () => ({ ok: false, retryAfter: 3600 }),
      guestAudit: async () => {
        throw new Error('guestAudit ne doit pas courir après un plafond');
      },
    };
    const res = await handleGuestCreate(
      json('POST', 'http://localhost/api/guest-audits', { url: 'exemple.fr' }),
      api,
    );
    expect(await status(res)).toEqual({
      status: 429,
      error: 'guest_limit',
    });
    expect(res.headers.get('retry-after')).toBe('3600');
  });
});
