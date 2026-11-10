-- E-mail de fin d’audit lancé à la main : horodatage d’envoi unique
-- et réglage de compte (activé par défaut). Idempotent.

alter table public.audits
  add column if not exists end_email_sent_at timestamptz;

comment on column public.audits.end_email_sent_at is
  'Horodatage de l’e-mail de fin d’audit manuel, posé atomiquement.';

alter table public.profiles
  add column if not exists notify_audit_end boolean not null default true;

comment on column public.profiles.notify_audit_end is
  'M’avertir par e-mail à la fin d’un audit lancé à la main.';

grant select (notify_audit_end) on public.profiles to authenticated;
grant update (notify_audit_end) on public.profiles to authenticated;

create or replace function public.claim_audit_end_email(p_audit_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.audits as a
  set end_email_sent_at = now()
  where a.id = p_audit_id
    and a.end_email_sent_at is null
    and a.trigger = 'manual'
    and a.status in ('done', 'failed');
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.release_audit_end_email(p_audit_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.audits as a
  set end_email_sent_at = null
  where a.id = p_audit_id
    and a.end_email_sent_at is not null;
end;
$$;

revoke all on function public.claim_audit_end_email(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_audit_end_email(uuid) to service_role;

revoke all on function public.release_audit_end_email(uuid)
  from public, anon, authenticated;
grant execute on function public.release_audit_end_email(uuid) to service_role;
