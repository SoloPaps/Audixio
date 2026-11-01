import { readFileSync } from 'node:fs';
import { DOMAINS, levelFor } from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { LOCKED_DOMAINS } from '../src/droits.js';
import { repoRoot } from './local.js';

const migration = readFileSync(
  `${repoRoot}supabase/migrations/20261023210000_init.sql`,
  'utf8',
);
const seed = readFileSync(`${repoRoot}supabase/seed.sql`, 'utf8');
const helper = readFileSync(`${repoRoot}packages/db/test/local.ts`, 'utf8');
const places = readFileSync(
  `${repoRoot}supabase/migrations/20261024180000_places.sql`,
  'utf8',
);
const coeur = readFileSync(
  `${repoRoot}supabase/migrations/20261101181500_coeur_droits.sql`,
  'utf8',
);
const authSql = readFileSync(
  `${repoRoot}supabase/migrations/20261101194215_auth_securite.sql`,
  'utf8',
);

const TABLES = [
  'profiles',
  'sites',
  'site_verifications',
  'audits',
  'domain_scores',
  'findings',
  'artifacts',
  'reports',
  'schedules',
  'uptime_checks',
  'uptime_daily',
  'incidents',
  'alerts',
  'oauth_tokens',
  'rate_limits',
  'audit_log',
  'terms_acceptances',
];

describe('migration', () => {
  it('active le RLS sur chaque table', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it('aligne domaines et niveaux sur le moteur', () => {
    for (const domain of DOMAINS) {
      expect(migration).toContain(`'${domain}'`);
    }
    for (const level of ['good', 'improve', 'problem', 'untested'] as const) {
      expect(
        levelFor(
          level === 'untested'
            ? null
            : level === 'good'
              ? 80
              : level === 'improve'
                ? 50
                : 0,
        ),
      ).toBe(level);
      expect(migration).toContain(`'${level}'`);
    }
  });

  it('file SKIP LOCKED réservée au service_role', () => {
    expect(migration).toMatch(/for update skip locked/i);
    expect(migration).toContain(
      'grant execute on function public.claim_next_audit() to service_role',
    );
    expect(migration).toContain(
      'revoke all on all functions in schema public from public, anon, authenticated',
    );
  });

  it('ne contient ni secret ni projet distant', () => {
    const blob = `${migration}\n${places}\n${coeur}\n${authSql}\n${seed}\n${helper}`;
    expect(blob).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(blob).not.toMatch(/supabase\.co/);
    expect(blob).not.toMatch(/--linked|--project-ref/);
    expect(helper).toContain("'db', 'reset', '--local', '--yes'");
  });
});

describe('cœur droits', () => {
  it('active le RLS et ne donne pas plan au client', () => {
    for (const table of ['action_plan_items', 'alert_settings']) {
      expect(coeur).toContain(`create table public.${table}`);
      expect(coeur).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(coeur).toContain(
        `revoke all on public.${table} from public, anon, authenticated`,
      );
    }
    expect(coeur).toContain('grant update (onboarding_vu)');
    expect(coeur).not.toMatch(/grant update \([^)]*\bplan\b/);
    expect(coeur).toContain('(select auth.uid())');
    expect(coeur).toContain('security definer');
    expect(coeur).toContain("set search_path = ''");
    expect(authSql).toContain(
      'alter function private.note_lettre(integer) set search_path',
    );
    expect(authSql).toContain(
      'revoke all on function public.list_my_oauth_connections() from public, anon, authenticated',
    );
    expect(authSql).toContain(
      'grant execute on function public.consume_rate_limit(text, timestamptz, integer) to service_role',
    );
    expect(authSql).not.toMatch(
      /grant execute on function public\.consume_rate_limit[\s\S]*to anon/,
    );
    for (const domain of LOCKED_DOMAINS) {
      expect(coeur).toContain(`'${domain}'`);
    }
  });
});

describe('seed', () => {
  it('cache les avis sans droit pour anon ni authenticated', () => {
    expect(places).toContain('create table public.site_places');
    expect(places).toContain('create table public.places_cache');
    expect(places).toContain(
      'alter table public.site_places enable row level security',
    );
    expect(places).toContain(
      'alter table public.places_cache enable row level security',
    );
    expect(places).toContain(
      'revoke all on public.site_places from public, anon, authenticated',
    );
    expect(places).toContain(
      'revoke all on public.places_cache from public, anon, authenticated',
    );
    expect(places).not.toMatch(/grant .+ to anon/i);
    expect(places).not.toMatch(/grant .+ to authenticated/i);
  });

  it('enregistre les deux sites du propriétaire', () => {
    expect(seed).toContain('https://angelique-osteo.fr');
    expect(seed).toContain('https://solopaps.github.io/Projet-Site-Artiste/');
    expect(seed).toContain("'origin'");
    expect(seed).toContain("'path'");
    expect(seed).toContain("'/Projet-Site-Artiste/'");
    expect(seed).toContain("'netlify'");
    expect(seed).toContain("'github_pages'");
  });
});
