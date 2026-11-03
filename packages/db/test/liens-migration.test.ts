import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './local.js';

const sql = readFileSync(
  `${repoRoot}supabase/migrations/20261103061242_liens_partage.sql`,
  'utf8',
);
const store = readFileSync(
  `${repoRoot}packages/orchestrator/src/liens-db.ts`,
  'utf8',
);

describe('migration liens de partage', () => {
  it('ajoute les colonnes, reprend le journal et refuse une échéance passée', () => {
    expect(sql).toContain('add column if not exists link_kind text');
    expect(sql).toContain('add column if not exists expires_at timestamptz');
    expect(sql).toContain('add column if not exists created_at timestamptz');
    expect(sql).toContain("l.action = 'share_link'");
    expect(sql).toContain('reports_link_kind');
    expect(sql).toContain("link_kind in ('public', 'team')");
    expect(sql).toContain('r.expires_at is null or r.expires_at > now()');
    expect(sql).toContain(
      'create or replace function public.read_shared_score(p_token text)',
    );
    expect(sql).toContain(
      'create or replace function public.read_report_by_share_token(p_token text)',
    );
    expect(sql).toContain('grant execute on function public.read_shared_score');
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).not.toMatch(/supabase\.co/);
    expect(sql).not.toMatch(/--linked|--project-ref/);
  });

  it('écrit kind et échéance sur le rapport à la création', () => {
    expect(store).toContain('link_kind: input.kind');
    expect(store).toContain('expires_at: input.expiresAt');
    expect(store).not.toContain('share_token: token');
  });
});
