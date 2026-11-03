import type { Sql } from 'postgres';
import { describe, expect, it } from 'vitest';
import { GUEST_AUDIT } from '../src/abus.js';
import {
  assertLocalSupabase,
  GUEST_AUDIT_LOCAL_LIMIT,
  guestAuditLimit,
  isLocalSupabaseUrl,
} from '../src/local-only.js';
import {
  guestLiftLine,
  LOCAL_TEST_ACCOUNTS,
  seedLocalAccounts,
  seedLocalDatabase,
} from '../src/local-seed.js';

const REMOTE_API = 'https://pzholfyjwanmkkfggsfe.supabase.co';
const REMOTE_DB =
  'postgresql://postgres:secret@db.pzholfyjwanmkkfggsfe.supabase.co:5432/postgres';
const LOCAL_API = 'http://127.0.0.1:54321';
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

describe('plafond visiteur local', () => {
  it('garde 3 audits hors Supabase local, même si le réglage est demandé', () => {
    expect(GUEST_AUDIT.limit).toBe(3);
    expect(guestAuditLimit({ supabaseUrl: REMOTE_API, lift: true })).toBe(3);
    expect(guestAuditLimit({ supabaseUrl: REMOTE_DB, lift: true })).toBe(3);
    expect(guestAuditLimit({ supabaseUrl: undefined, lift: true })).toBe(3);
    expect(guestAuditLimit({ supabaseUrl: 'pas une url', lift: true })).toBe(3);
    expect(guestAuditLimit({ supabaseUrl: LOCAL_API, lift: false })).toBe(3);
    expect(
      guestAuditLimit({
        supabaseUrl: 'http://127.0.0.1.evil.test',
        lift: true,
      }),
    ).toBe(3);
  });

  it('reste sous le plafond SQL de consume_rate_limit', () => {
    expect(GUEST_AUDIT_LOCAL_LIMIT).toBeGreaterThan(GUEST_AUDIT.limit);
    expect(GUEST_AUDIT_LOCAL_LIMIT).toBeLessThanOrEqual(1000);
  });

  it('lève le plafond seulement avec une URL locale et le réglage', () => {
    expect(guestAuditLimit({ supabaseUrl: LOCAL_API, lift: true })).toBe(
      GUEST_AUDIT_LOCAL_LIMIT,
    );
    expect(
      guestAuditLimit({ supabaseUrl: 'http://localhost:54321', lift: true }),
    ).toBe(GUEST_AUDIT_LOCAL_LIMIT);
    expect(
      guestAuditLimit({ supabaseUrl: 'http://[::1]:54321', lift: true }),
    ).toBe(GUEST_AUDIT_LOCAL_LIMIT);
    expect(isLocalSupabaseUrl(LOCAL_DB)).toBe(true);
    expect(isLocalSupabaseUrl(REMOTE_API)).toBe(false);
  });
});

describe('seed local', () => {
  it('refuse le seed hors local avant toute requête', async () => {
    let called = false;
    const sql = new Proxy(
      () => {
        called = true;
      },
      {
        get() {
          called = true;
          return () => {
            called = true;
          };
        },
      },
    ) as unknown as Sql;
    await expect(
      seedLocalAccounts(sql, { apiUrl: REMOTE_API, dbUrl: REMOTE_DB }),
    ).rejects.toThrow(/hors_local/);
    await expect(
      seedLocalDatabase({ apiUrl: REMOTE_API, dbUrl: LOCAL_DB }),
    ).rejects.toThrow(/hors_local/);
    await expect(
      seedLocalDatabase({ apiUrl: LOCAL_API, dbUrl: REMOTE_DB }),
    ).rejects.toThrow(/hors_local/);
    expect(called).toBe(false);
    expect(() => assertLocalSupabase(REMOTE_API)).toThrow(/hors_local/);
  });

  it('retire le réglage du fichier env hors local', () => {
    const kept = guestLiftLine(
      'SUPABASE_URL=https://exemple.supabase.co\nAUDIGY_GUEST_UNLIMITED=1\n',
      false,
    );
    expect(kept).not.toContain('AUDIGY_GUEST_UNLIMITED');
    expect(kept).toContain('SUPABASE_URL=https://exemple.supabase.co');
    const added = guestLiftLine('SUPABASE_URL=http://127.0.0.1:54321\n', true);
    expect(added).toContain('AUDIGY_GUEST_UNLIMITED=1');
    expect(added.match(/AUDIGY_GUEST_UNLIMITED/g)).toHaveLength(1);
  });

  it('publie des mots de passe locaux d’au moins 10 caractères', () => {
    expect(LOCAL_TEST_ACCOUNTS.map((account) => account.plan).sort()).toEqual([
      'free',
      'pro',
    ]);
    for (const account of LOCAL_TEST_ACCOUNTS) {
      expect(account.password.length).toBeGreaterThanOrEqual(10);
      expect(account.email.endsWith('@localhost')).toBe(true);
    }
  });
});
