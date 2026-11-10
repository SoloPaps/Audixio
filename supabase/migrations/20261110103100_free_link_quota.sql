-- Plafond unique du plan gratuit : 1 occupant parmi les sites publiés
-- (is_public, deleted_at is null) et les liens de partage encore actifs
-- (reports.visibility = 'link', revoked_at null, expires_at null ou future).
-- Le plan Pro n’est pas limité. Idempotent (create or replace, drop trigger if exists).

create or replace function public.free_link_slots_used(p_owner uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)::integer
      from public.sites as s
      where s.owner_id = p_owner
        and s.is_public = true
        and s.deleted_at is null
    )
    +
    (
      select count(*)::integer
      from public.reports as r
      join public.audits as a on a.id = r.audit_id
      join public.sites as s on s.id = a.site_id
      where s.owner_id = p_owner
        and s.deleted_at is null
        and r.visibility = 'link'
        and r.revoked_at is null
        and (r.expires_at is null or r.expires_at > now())
    );
$$;

revoke all on function public.free_link_slots_used(uuid) from public, anon, authenticated;
grant execute on function public.free_link_slots_used(uuid) to authenticated, service_role;

create or replace function public.enforce_free_link_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  plan text;
begin
  if tg_table_name = 'sites' then
    if new.is_public is not true or new.deleted_at is not null then
      return new;
    end if;
    -- Republier un site déjà public ne consomme pas un slot de plus.
    if tg_op = 'UPDATE' and old.is_public is true and old.deleted_at is null then
      return new;
    end if;
    owner := new.owner_id;
  else
    -- reports : seulement un nouveau lien actif (pas la mise à jour d’un lien déjà occupant).
    if new.visibility is distinct from 'link' or new.revoked_at is not null then
      return new;
    end if;
    if tg_op = 'UPDATE'
      and old.visibility = 'link'
      and old.revoked_at is null
      and (old.expires_at is null or old.expires_at > now())
    then
      return new;
    end if;
    select s.owner_id into owner
    from public.audits as a
    join public.sites as s on s.id = a.site_id
    where a.id = new.audit_id;
    if owner is null then
      return new;
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(owner::text || ':free-link-quota')
  );

  select p.plan into plan from public.profiles as p where p.id = owner;
  if plan is not distinct from 'pro' then
    return new;
  end if;

  if public.free_link_slots_used(owner) >= 1 then
    raise exception 'user_limit'
      using errcode = 'P0001',
            hint = 'free plan allows one active publication or share link';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_free_link_quota() from public, anon, authenticated;
grant execute on function public.enforce_free_link_quota() to authenticated, service_role;

drop trigger if exists enforce_free_link_quota_sites on public.sites;
create trigger enforce_free_link_quota_sites
  before insert or update on public.sites
  for each row
  execute function public.enforce_free_link_quota();

drop trigger if exists enforce_free_link_quota_reports on public.reports;
create trigger enforce_free_link_quota_reports
  before insert or update on public.reports
  for each row
  execute function public.enforce_free_link_quota();
