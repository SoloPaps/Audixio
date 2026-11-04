-- /score n'expose plus un rapport public expiré (reports.expires_at).
-- Corps identique à 20261101191850_coeur_droits.sql, sauf la clause d'expiration.
create or replace function public.read_public_score(p_slug text)
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
  from public.sites as s
  left join lateral (
    select
      au.id,
      au.finished_at,
      au.method_version,
      au.global_score,
      au.coverage
    from public.audits as au
    where au.site_id = s.id
      and au.status in ('done', 'partial')
      and au.finished_at is not null
    order by au.finished_at desc, au.id desc
    limit 1
  ) as a on true
  left join lateral (
    select rep.id
    from public.reports as rep
    where rep.audit_id = a.id
      and rep.revoked_at is null
      and rep.visibility in ('public', 'link')
      and (rep.expires_at is null or rep.expires_at > now())
    order by rep.visibility desc, rep.id
    limit 1
  ) as r on true
  where s.is_public
    and s.deleted_at is null
    and p_slug ~ '^[a-z0-9-]{8,64}$'
    and s.public_slug = p_slug;
$$;
