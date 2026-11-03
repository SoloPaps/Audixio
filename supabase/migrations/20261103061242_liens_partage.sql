-- Liens de partage : kind, échéance, date. RLS inchangée.
-- Reprend le journal audit_log (action share_link) tant que link_kind est vide.
-- read_shared_score et read_report_by_share_token ne renvoient plus rien
-- si le lien est révoqué ou si expires_at est passé.
-- Rien n'est appliqué sur un projet distant par ce fichier.

alter table public.reports
  add column if not exists link_kind text;

alter table public.reports
  add column if not exists expires_at timestamptz;

alter table public.reports
  add column if not exists created_at timestamptz;

-- Une date illisible dans le journal ne fait pas échouer la migration.
do $$
declare
  rec record;
  exp timestamptz;
begin
  for rec in
    select distinct on (l.target)
      l.target,
      l.at,
      l.details->>'kind' as kind,
      l.details->>'expires_at' as expires_raw
    from public.audit_log as l
    where l.action = 'share_link'
      and l.target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    order by l.target, l.at asc
  loop
    if rec.kind is distinct from 'public' and rec.kind is distinct from 'team' then
      continue;
    end if;
    begin
      if rec.expires_raw is null or rec.expires_raw = '' then
        exp := null;
      else
        exp := rec.expires_raw::timestamptz;
      end if;
    exception
      when others then
        exp := null;
    end;
    update public.reports as r
    set
      link_kind = rec.kind,
      expires_at = exp,
      created_at = rec.at
    where r.id = rec.target::uuid
      and r.link_kind is null;
  end loop;
end
$$;

update public.reports
set created_at = now()
where created_at is null;

alter table public.reports
  alter column created_at set default now();

alter table public.reports
  alter column created_at set not null;

alter table public.reports
  drop constraint if exists reports_link_kind;

alter table public.reports
  add constraint reports_link_kind check (
    link_kind is null or link_kind in ('public', 'team')
  );

create or replace function public.read_shared_score(p_token text)
returns table (
  site_label text,
  site_url text,
  audit_id uuid,
  finished_at timestamptz,
  method_version text,
  global_score integer,
  coverage double precision,
  report_id uuid,
  expose_security boolean,
  domains jsonb,
  security_details jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.label,
    s.url,
    a.id,
    a.finished_at,
    a.method_version,
    null::integer,
    a.coverage,
    r.id,
    s.expose_security,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'domain', d.domain,
          'score', d.score,
          'level', d.level
        )
        order by d.domain
      )
      from public.domain_scores as d
      where d.audit_id = a.id
        and not private.domain_locked(d.domain)
    ), '[]'::jsonb),
    '[]'::jsonb
  from public.reports as r
  join public.audits as a on a.id = r.audit_id
  join public.sites as s on s.id = a.site_id
  where r.visibility = 'link'
    and r.revoked_at is null
    and (r.expires_at is null or r.expires_at > now())
    and s.deleted_at is null
    and p_token ~ '^[0-9a-f]{32}$'
    and r.share_token = p_token;
$$;

create or replace function public.read_report_by_share_token(p_token text)
returns table (
  id uuid,
  audit_id uuid,
  visibility text,
  manifest_sha256 text,
  tsa text,
  tsa_gen_time timestamptz,
  signature text,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.audit_id,
    r.visibility,
    r.manifest_sha256,
    r.tsa,
    r.tsa_gen_time,
    r.signature,
    r.revoked_at
  from public.reports as r
  where r.visibility = 'link'
    and r.revoked_at is null
    and (r.expires_at is null or r.expires_at > now())
    and p_token ~ '^[0-9a-f]{32}$'
    and r.share_token = p_token;
$$;

revoke all on function public.read_shared_score(text) from public, anon, authenticated;
revoke all on function public.read_report_by_share_token(text) from public, anon, authenticated;
grant execute on function public.read_shared_score(text) to anon, authenticated, service_role;
grant execute on function public.read_report_by_share_token(text) to anon, authenticated, service_role;
