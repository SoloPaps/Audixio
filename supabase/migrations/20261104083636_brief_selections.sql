-- Choix Rien / Vérif / Fix d’un constat, par compte et par audit.
-- Le client authentifié lit et écrit les siens. RLS : propriétaire de l’audit.

create table public.brief_selections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  audit_id uuid not null references public.audits (id) on delete cascade,
  finding_id text not null,
  choice text not null,
  updated_at timestamptz not null default now(),
  constraint brief_selections_finding check (
    char_length(finding_id) between 1 and 160
  ),
  constraint brief_selections_choice check (
    choice in ('none', 'chk', 'fix')
  ),
  primary key (user_id, audit_id, finding_id)
);

create index brief_selections_audit_idx
  on public.brief_selections (audit_id);

comment on table public.brief_selections is
  'Choix d’action d’un constat (rien, vérifier, corriger) pour le brief.';

alter table public.brief_selections enable row level security;

revoke all on public.brief_selections from public, anon, authenticated;
grant select, insert, update, delete on public.brief_selections to authenticated;
grant all on public.brief_selections to service_role;

create policy brief_selections_select on public.brief_selections
for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_audit(audit_id))
);

create policy brief_selections_insert on public.brief_selections
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.owns_audit(audit_id))
);

create policy brief_selections_update on public.brief_selections
for update to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_audit(audit_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.owns_audit(audit_id))
);

create policy brief_selections_delete on public.brief_selections
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_audit(audit_id))
);
