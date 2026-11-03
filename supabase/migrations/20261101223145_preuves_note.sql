-- Brique preuves : la note globale ne se lit plus en colonne.
-- Le rapport passe par read_rapport_apercu. Les sondes restent hors de cette migration.
-- Search Console n'est pas sondé (voir docs/dev/PREUVES-PROPRIETE.md).

create or replace function private.note_si_verifie(p_audit_id uuid)
returns table (grade text, score integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when private.site_verified(a.site_id) then a.grade else null end,
    case when private.site_verified(a.site_id) then a.global_score else null end
  from public.audits as a
  join public.sites as s on s.id = a.site_id
  where a.id = p_audit_id
    and s.owner_id = (select auth.uid());
$$;

revoke all on function private.note_si_verifie(uuid) from public, anon;
grant execute on function private.note_si_verifie(uuid) to authenticated, service_role;

create or replace function public.read_rapport_apercu(p_audit_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_site uuid;
  v_status text;
  v_grade text;
  v_score integer;
  v_verified boolean;
  v_plan text;
  v_open integer;
  v_domaines jsonb;
  v_constats jsonb;
begin
  if v_uid is null or p_audit_id is null then
    return null;
  end if;

  select a.site_id, a.status
  into v_site, v_status
  from public.audits as a
  join public.sites as s on s.id = a.site_id
  where a.id = p_audit_id
    and s.owner_id = v_uid;

  if v_site is null then
    return null;
  end if;

  select n.grade, n.score
  into v_grade, v_score
  from private.note_si_verifie(p_audit_id) as n;

  select exists (
    select 1
    from public.site_verifications as v
    where v.site_id = v_site
      and v.status = 'verified'
  ) into v_verified;

  select p.plan into v_plan
  from public.profiles as p
  where p.id = v_uid;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'domaine', d.domain,
      'verrouille', false,
      'note', d.grade,
      'score', d.score,
      'niveau', d.level
    )
    order by d.domain
  ), '[]'::jsonb)
  into v_domaines
  from public.domain_scores as d
  where d.audit_id = p_audit_id
    and not private.domain_locked(d.domain);

  if v_verified then
    select v_domaines || coalesce(jsonb_agg(
      jsonb_build_object(
        'domaine', d.domain,
        'verrouille', false,
        'note', d.grade,
        'score', d.score,
        'niveau', d.level
      )
      order by d.domain
    ), '[]'::jsonb)
    into v_domaines
    from public.domain_scores as d
    where d.audit_id = p_audit_id
      and private.domain_locked(d.domain);
  else
    v_domaines := v_domaines || jsonb_build_array(
      jsonb_build_object(
        'domaine', 'securite', 'verrouille', true,
        'note', null, 'score', null, 'niveau', null
      ),
      jsonb_build_object(
        'domaine', 'vie_privee', 'verrouille', true,
        'note', null, 'score', null, 'niveau', null
      ),
      jsonb_build_object(
        'domaine', 'dns_email', 'verrouille', true,
        'note', null, 'score', null, 'niveau', null
      )
    );
  end if;

  select count(*)::integer into v_open
  from public.domain_scores as d
  where d.audit_id = p_audit_id
    and d.score is not null
    and d.domain in (
      'performance', 'seo', 'ecologie', 'qualite', 'accessibilite'
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'domaine', f.domain,
      'check_id', f.check_id,
      'statut', f.status,
      'severite', f.severity,
      'cle', f.message_key,
      'mesure', f.measured,
      'correctif', case when v_verified then f.fix_key else null end
    )
    order by f.severity desc, f.check_id
  ), '[]'::jsonb)
  into v_constats
  from public.findings as f
  where f.audit_id = p_audit_id
    and (
      v_verified
      or not private.domain_locked(f.domain)
    );

  return jsonb_build_object(
    'audit_id', p_audit_id,
    'statut_audit', v_status,
    'site_verifie', v_verified,
    'plan', v_plan,
    'note_globale', case when v_verified then v_grade else null end,
    'score_global', case when v_verified then v_score else null end,
    'note_partielle', case
      when v_verified then null
      else format(
        'partielle · %s domaines · site non vérifié',
        v_open
      )
    end,
    'domaines_ouverts', v_open,
    'mention_a11y', case
      when v_verified then null
      else 'mesure automatique / partielle'
    end,
    'comment_corriger_branche', v_verified,
    'domaines', v_domaines,
    'constats', v_constats
  );
end;
$$;

-- Un GRANT de table couvre toutes les colonnes : il faut le retirer,
-- puis rouvrir les colonnes qui ne portent pas la note globale.
revoke select on table public.audits from anon, authenticated;
grant select (
  id,
  site_id,
  trigger,
  mode,
  status,
  method_version,
  engine_version,
  coverage,
  created_at,
  started_at,
  finished_at,
  error
) on table public.audits to authenticated;

-- Un seul jeton par site (donc par propriétaire). Les méthodes le réutilisent.
create or replace function public.prepare_site_verification(
  p_site_id uuid,
  p_owner_id uuid,
  p_method text,
  p_token text,
  p_evidence jsonb
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_id uuid;
begin
  if p_owner_id is null or p_site_id is null then
    raise exception 'site_not_found' using errcode = '22023';
  end if;
  if p_method not in (
    'dns_txt', 'file', 'html_file', 'meta', 'well_known', 'search_console'
  ) then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.sites as s
    where s.id = p_site_id
      and s.owner_id = p_owner_id
      and s.deleted_at is null
  ) then
    raise exception 'site_not_found' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('verify:' || p_site_id::text, 0));

  select v.token into v_token
  from public.site_verifications as v
  where v.site_id = p_site_id
  order by v.created_at asc, v.id asc
  limit 1;

  if v_token is null then
    v_token := p_token;
  end if;

  select v.id into v_id
  from public.site_verifications as v
  where v.site_id = p_site_id
    and v.method = p_method
    and v.status in ('pending', 'verified')
  order by v.created_at desc, v.id desc
  limit 1;

  if v_id is not null then
    return query select v_id, v_token;
    return;
  end if;

  insert into public.site_verifications as inserted (
    site_id, method, token, status, evidence
  )
  values (
    p_site_id,
    p_method,
    v_token,
    'pending',
    coalesce(p_evidence, '{}'::jsonb)
  )
  returning inserted.id into v_id;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.prepare_site_verification(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_site_verification(uuid, uuid, text, text, jsonb)
  to service_role;

-- 10 sondes par utilisateur et par heure, 6 par hôte et par 15 minutes.
create or replace function public.consume_verification_probe(
  p_user_id uuid,
  p_host text
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host text := lower(btrim(p_host));
  v_user_key text;
  v_host_key text;
  v_hour timestamptz;
  v_slot timestamptz;
  v_user_count integer;
  v_host_count integer;
begin
  if p_user_id is null
    or v_host is null
    or length(v_host) = 0
    or length(v_host) > 253
    or v_host !~ '^[a-z0-9.-]+$'
  then
    return query select false, 60;
    return;
  end if;

  v_user_key := private.rate_key('verify-user', p_user_id::text);
  v_host_key := private.rate_key('verify-host', v_host);
  v_hour := date_trunc('hour', now());
  v_slot := to_timestamp(floor(extract(epoch from now()) / 900) * 900);

  perform pg_advisory_xact_lock(hashtextextended(v_user_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(v_host_key, 0));

  select coalesce(sum(r.count), 0) into v_user_count
  from public.rate_limits as r
  where r.key = v_user_key
    and r.window_start = v_hour;
  if v_user_count >= 10 then
    return query select
      false,
      greatest(1, ceil(extract(epoch from (v_hour + interval '1 hour' - now()))))::integer;
    return;
  end if;

  select coalesce(sum(r.count), 0) into v_host_count
  from public.rate_limits as r
  where r.key = v_host_key
    and r.window_start = v_slot;
  if v_host_count >= 6 then
    return query select
      false,
      greatest(1, ceil(extract(epoch from (v_slot + interval '15 minutes' - now()))))::integer;
    return;
  end if;

  insert into public.rate_limits (key, window_start, count)
  values (v_user_key, v_hour, 1)
  on conflict (key, window_start) do update
    set count = public.rate_limits.count + 1;

  insert into public.rate_limits (key, window_start, count)
  values (v_host_key, v_slot, 1)
  on conflict (key, window_start) do update
    set count = public.rate_limits.count + 1;

  delete from public.rate_limits as r
  where r.window_start < now() - interval '2 days';

  return query select true, null::integer;
end;
$$;

revoke all on function public.consume_verification_probe(uuid, text)
  from public, anon, authenticated;
grant execute on function public.consume_verification_probe(uuid, text)
  to service_role;
