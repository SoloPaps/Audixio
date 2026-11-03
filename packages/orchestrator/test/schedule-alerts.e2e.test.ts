import { randomUUID } from 'node:crypto';
import { createServiceClient, createUserClient } from '@audigy/db';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from '../../db/test/local.js';
import { createLogger } from '../src/log.js';
import type { OutboundMail } from '../src/mail.js';
import {
  handleDigest,
  handleSchedule,
  runWeeklyDigest,
} from '../src/schedule.js';
import {
  supabaseDigestStore,
  supabaseScheduleStore,
  supabaseUnsubscribe,
} from '../src/schedule-db.js';

const NOW = new Date('2026-03-16T12:00:00.000Z');

let local: LocalSupabase;
let admin: Sql | undefined;
let unlock: (() => Promise<void>) | undefined;
let userId = '';
let email = '';
let siteId = '';
let hiddenId = '';

describe('planificateur alertes (base locale, courriel simulé)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 1, prepare: false });
    const service = createServiceClient({
      url: local.apiUrl,
      serviceRoleKey: local.serviceRoleKey,
    });
    email = `planif-${randomUUID()}@example.com`;
    const password = randomUUID();
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) throw new Error('create_user');
    userId = created.data.user.id;
    const anon = createUserClient({
      url: local.apiUrl,
      anonKey: local.anonKey,
    });
    const session = await anon.auth.signInWithPassword({ email, password });
    if (session.error || !session.data.session) throw new Error('sign_in');
    const host = `p${randomUUID().replace(/-/g, '').slice(0, 12)}.example`;
    const hiddenHost = `h${randomUUID().replace(/-/g, '').slice(0, 12)}.example`;
    const sites = await service
      .from('sites')
      .insert([
        {
          owner_id: userId,
          url: `https://${host}/`,
          scope: 'origin',
          host,
          label: 'Suivi',
          hosting: 'other',
        },
        {
          owner_id: userId,
          url: `https://${hiddenHost}/`,
          scope: 'origin',
          host: hiddenHost,
          label: 'Pas vérifié',
          hosting: 'other',
        },
      ])
      .select('id, host');
    if (sites.error || !sites.data || sites.data.length !== 2) {
      throw new Error('site_insert');
    }
    siteId = sites.data.find((row) => row.host === host)?.id ?? '';
    hiddenId = sites.data.find((row) => row.host === hiddenHost)?.id ?? '';
    const authed = createUserClient({
      url: local.apiUrl,
      anonKey: local.anonKey,
      accessToken: session.data.session.access_token,
    });
    const ensured = await authed.rpc('ensure_alert_settings', {
      p_site_id: siteId,
    });
    if (ensured.error) {
      throw new Error(
        `ensure_alert_settings:${ensured.error.code ?? ''}:${ensured.error.message}`,
      );
    }
    const proof = await service.from('site_verifications').insert({
      site_id: siteId,
      method: 'file',
      token: `t${'a'.repeat(32)}`,
      status: 'verified',
      verified_at: NOW.toISOString(),
    });
    if (proof.error) throw new Error('verif_insert');
    if (!admin) throw new Error('admin');
    const audits = await admin<{ id: string; global_score: number }[]>`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, created_at, finished_at
      ) values
        (
          ${siteId}::uuid, 'manual', 'passive', 'done', '2026.1', 'test',
          82, 1, '2026-01-10T00:00:00.000Z', '2026-01-10T00:00:00.000Z'
        ),
        (
          ${siteId}::uuid, 'manual', 'passive', 'done', '2026.1', 'test',
          70, 1, '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'
        )
      returning id::text as id, global_score
    `;
    const previous = audits.find((row) => row.global_score === 82)?.id;
    const latest = audits.find((row) => row.global_score === 70)?.id;
    if (!previous || !latest) throw new Error('audit_ids');
    await admin`
      insert into public.findings (
        audit_id, domain, check_id, status, severity, impact, message_key, measured
      ) values
        (
          ${previous}::uuid, 'seo', 'seo.description', 'fail', 2, 2,
          'finding.seo.description', '{}'::jsonb
        ),
        (
          ${latest}::uuid, 'securite', 'securite.https', 'fail', 4, 3,
          'finding.securite.https', '{}'::jsonb
        ),
        (
          ${latest}::uuid, 'securite', 'securite.certificate', 'fail', 2, 2,
          'finding.securite.certificate',
          '{"daysRemaining":10,"validTo":"2026-03-26"}'::jsonb
        )
    `;
    const daily = await service.from('uptime_daily').insert({
      site_id: siteId,
      day: '2026-03-16',
      checks: 4,
      failures: 0,
      p50_ms: 20,
    });
    if (daily.error) throw new Error('uptime_insert');
    const digestFlag = await service
      .from('profiles')
      .update({ weekly_digest: true })
      .eq('id', userId);
    if (digestFlag.error) throw new Error('digest_flag');
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
    if (local && userId) {
      const service = createServiceClient({
        url: local.apiUrl,
        serviceRoleKey: local.serviceRoleKey,
      });
      await service.auth.admin.deleteUser(userId);
    }
    if (unlock) await unlock();
  });

  it('lit ensure_alert_settings, envoie une fois, respecte le gratuit et Mailpit', async () => {
    const service = createServiceClient({
      url: local.apiUrl,
      serviceRoleKey: local.serviceRoleKey,
    });
    const inner = supabaseScheduleStore(service);
    const roster = await inner.roster(NOW);
    const followed = roster.sites.find((site) => site.id === siteId);
    const hidden = roster.sites.find((site) => site.id === hiddenId);
    expect(followed?.prefs).toMatchObject({
      plan: 'free',
      cadence: 'monthly',
      sslWarnDays: 14,
      scoreDropPoints: 0,
      alertsEnabled: true,
      verified: true,
    });
    expect(hidden?.prefs?.verified).toBe(false);
    expect(
      roster.due.some(
        (item) => item.siteId === siteId && item.mode === 'passive',
      ),
    ).toBe(true);
    expect(roster.due.some((item) => item.siteId === hiddenId)).toBe(false);

    const ours = new Set([siteId, hiddenId]);
    const store = {
      ...inner,
      async roster(now: Date) {
        const full = await inner.roster(now);
        return {
          sites: full.sites.filter((site) => ours.has(site.id)),
          due: full.due.filter((item) => ours.has(item.siteId)),
        };
      },
    };
    const sent: OutboundMail[] = [];
    const deps = {
      now: () => NOW,
      store,
      probe: async () => ({ ok: true, statusCode: 200, ms: 4 }),
      mailer: {
        send: async (message: OutboundMail) => {
          sent.push(message);
        },
      },
      appBaseUrl: 'https://audixio.test',
      signingKey: local.serviceRoleKey,
      logger: createLogger({ sink: () => {} }),
      trigger: async () => {},
    };
    const first = await handleSchedule(
      new Request('https://audixio.test/.netlify/functions/schedule-tick', {
        method: 'POST',
      }),
      deps,
    );
    expect(first.status).toBe(200);
    expect(sent.map((message) => message.subject).sort()).toEqual([
      'La note de votre site a baissé',
      'Le certificat expire bientôt',
      'Un problème grave est apparu',
    ]);
    expect(sent.every((message) => message.to === email)).toBe(true);
    expect(sent[0]?.text).toContain('/api/unsubscribe');

    const second = await handleSchedule(
      new Request('https://audixio.test/.netlify/functions/schedule-tick', {
        method: 'POST',
      }),
      deps,
    );
    expect(second.status).toBe(200);
    expect(sent).toHaveLength(3);
    const queued = await service
      .from('audits')
      .select('id')
      .eq('site_id', siteId)
      .eq('trigger', 'schedule');
    expect(queued.data).toHaveLength(1);

    const digestInner = supabaseDigestStore(service);
    const digestDeps = {
      now: () => NOW,
      store: {
        ...digestInner,
        async recipients(now: Date) {
          const people = await digestInner.recipients(now);
          return people.filter((person) => person.userId === userId);
        },
      },
      mailer: deps.mailer,
      appBaseUrl: deps.appBaseUrl,
      signingKey: deps.signingKey,
      logger: deps.logger,
    };
    expect((await runWeeklyDigest(digestDeps)).sent).toBe(1);
    expect((await runWeeklyDigest(digestDeps)).sent).toBe(0);
    const recap = sent.at(-1);
    expect(recap?.subject).toBe('Votre récap du lundi');
    expect(recap?.text).toContain('constat corrigé');
    expect(recap?.text).toContain('Certificat : 10 jours');
    expect(recap?.text).not.toContain(hidden?.host ?? 'pas-verifie');

    await supabaseUnsubscribe(service, userId);
    const after = await handleDigest(
      new Request('https://audixio.test/digest?run=1', { method: 'POST' }),
      digestDeps,
    );
    expect(after.status).toBe(200);
    expect(
      sent.filter((message) => message.subject.includes('récap')),
    ).toHaveLength(1);

    const box = await fetch(`${local.mailpitUrl}/api/v1/messages`);
    expect(box.ok).toBe(true);
    const payload = (await box.json()) as {
      messages?: { To?: { Address?: string }[] }[];
    };
    const leaked = (payload.messages ?? []).filter((message) =>
      (message.To ?? []).some((to) => to.Address === email),
    );
    expect(leaked).toEqual([]);
  }, 60_000);
});
