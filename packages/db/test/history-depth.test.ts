import { randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

let admin: Sql;
let unlock: (() => Promise<void>) | undefined;

describe('U5 — profondeur historique 1, contrôle RLS', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    admin = postgres(localSupabaseStatus().dbUrl, { max: 1, prepare: false });
  }, 300_000);
  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('gratuit : dernier par site uniquement, même en demandant les anciens IDs ; Pro inchangé', async () => {
    const owner = randomUUID();
    const stranger = randomUUID();
    const site = randomUUID();
    const site2 = randomUUID();
    // Ordre d’UUID volontairement contraire à l’ordre d’insertion : départage stable.
    const old = '00000000-0000-4000-8000-000000000001';
    const latest = '00000000-0000-4000-8000-000000000002';
    const other = randomUUID();
    const running = randomUUID();
    await admin`insert into auth.users (id, email) values (${owner}::uuid, ${`${owner}@test.local`}), (${stranger}::uuid, ${`${stranger}@test.local`})`;
    await admin`insert into public.sites(id, owner_id, url, host, scope, hosting) values
      (${site}::uuid, ${owner}::uuid, 'https://one.test', 'one.test', 'origin', 'other'),
      (${site2}::uuid, ${owner}::uuid, 'https://two.test', 'two.test', 'origin', 'other')`;
    for (const sid of [site, site2]) {
      await admin`insert into public.site_verifications (site_id, method, token, status, verified_at)
        values (${sid}::uuid, 'dns_txt', ${'t'.repeat(32)}, 'verified', now())`;
    }
    for (const [id, sid, status] of [
      [old, site, 'done'],
      [latest, site, 'partial'],
      [other, site2, 'done'],
      [running, site, 'running'],
    ] as const) {
      await admin`insert into public.audits (id, site_id, trigger, mode, status, method_version, engine_version, created_at)
        values (${id}::uuid, ${sid}::uuid, 'manual', 'passive', ${status}, '1', '1', '2026-11-01T12:00:00Z')`;
      if (status === 'running') continue;
      await admin`insert into public.domain_scores (audit_id, domain, score, coverage, level) values (${id}::uuid, 'performance', 80, 1, 'good')`;
      await admin`insert into public.findings (audit_id, domain, check_id, status, message_key, severity, impact)
        values (${id}::uuid, 'performance', 'performance.poids', 'pass', 'performance.poids.pass', 1, 1)`;
      await admin`insert into public.artifacts (audit_id, kind, storage_path, sha256, bytes)
        values (${id}::uuid, 'json', 'audit/test.json', ${'a'.repeat(64)}, 1)`;
      await admin`insert into public.reports (audit_id) values (${id}::uuid)`;
    }
    const read = async (user: string) =>
      admin.begin(async (sql) => {
        await sql`set local role authenticated`;
        await sql`select set_config('request.jwt.claim.sub', ${user}, true)`;
        const audits = await sql`select id from public.audits order by id`;
        const tables = [];
        for (const table of [
          'domain_scores',
          'findings',
          'artifacts',
          'reports',
        ]) {
          tables.push(
            await sql`select audit_id from ${sql(table)} order by audit_id`,
          );
        }
        const hidden =
          await sql`select id from public.audits where id = ${old}::uuid`;
        const rpc =
          await sql`select public.read_rapport_apercu(${old}::uuid) as body`;
        const note =
          await sql`select * from private.note_si_verifie(${old}::uuid)`;
        return { audits, tables, hidden, rpc, note };
      });
    const free = await read(owner);
    expect(free.audits.map((r) => r.id).sort()).toEqual(
      [latest, other, running].sort(),
    );
    for (const rows of free.tables)
      expect(rows.map((r) => r.audit_id).sort()).toEqual(
        [latest, other].sort(),
      );
    expect(free.hidden).toHaveLength(0);
    expect(free.rpc[0]?.body).toBeNull();
    expect(free.note).toHaveLength(0);
    const denied = await read(stranger);
    expect(denied.audits).toHaveLength(0);
    for (const rows of denied.tables) expect(rows).toHaveLength(0);
    await expect(
      admin.begin(async (sql) => {
        await sql`set local role authenticated`;
        await sql`select set_config('request.jwt.claim.sub', ${owner}, true)`;
        await sql`insert into public.reports (audit_id) values (${old}::uuid)`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
    // Le plan vient de profiles côté serveur, pas d’une valeur manipulable du client.
    await admin`update public.profiles set plan = 'pro' where id = ${owner}::uuid`;
    const pro = await read(owner);
    expect(pro.audits).toHaveLength(4);
    for (const rows of pro.tables) expect(rows).toHaveLength(3);
    expect(pro.hidden).toHaveLength(1);
    expect(pro.rpc[0]?.body).not.toBeNull();
    await admin`update public.profiles set plan = 'free' where id = ${owner}::uuid`;
    expect((await read(owner)).hidden).toHaveLength(0);
    // Un échec plus récent n’ouvre jamais les anciens rapports ; polling toujours permis.
    await admin`update public.audits set status = 'failed', created_at = '2026-11-02T12:00:00Z' where id = ${running}::uuid`;
    expect((await read(owner)).audits.map((r) => r.id).sort()).toEqual(
      [other, running].sort(),
    );
    // Les données ne sont pas effacées : workers et upgrade Pro les conservent.
    const saved =
      await admin`select id from public.audits where site_id = ${site}::uuid`;
    expect(saved).toHaveLength(3);
  });
});
