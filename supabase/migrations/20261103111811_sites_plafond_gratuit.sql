-- Plafond gratuit : 2 sites actifs. Local seulement, rien n'est poussé au projet distant.
-- Le verrou d'avis sérialise deux insertions parallèles du même propriétaire.

create or replace function private.enforce_free_site_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_plan text;
  v_count integer;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  v_uid := auth.uid();
  if v_uid is not null and v_uid is distinct from new.owner_id then
    raise exception 'site_interdit' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.owner_id::text));

  select p.plan into v_plan
  from public.profiles as p
  where p.id = new.owner_id;

  if v_plan is distinct from 'free' then
    return new;
  end if;

  select count(*)::integer into v_count
  from public.sites as s
  where s.owner_id = new.owner_id
    and s.deleted_at is null;

  if v_count >= 2 then
    raise exception 'site_limit' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_free_site_cap() from public, anon, authenticated;
grant execute on function private.enforce_free_site_cap() to authenticated, service_role;

drop trigger if exists sites_free_cap on public.sites;
create trigger sites_free_cap
  before insert on public.sites
  for each row
  execute function private.enforce_free_site_cap();
