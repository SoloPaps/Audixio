-- Durcissement : anon ne lit plus les tables sites et reports.
-- Un compte ne lit plus les lignes publiques des autres.
-- Les pages publiques restent sur les RPC. Local seulement, rien n'est poussé au projet distant.

revoke select on table public.sites from anon;
revoke select on table public.reports from anon;

drop policy if exists sites_select_anon on public.sites;
drop policy if exists reports_select_anon on public.reports;

drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites
for select to authenticated
using (
  owner_id = (select auth.uid())
  and deleted_at is null
);

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
for select to authenticated
using (private.owns_audit(audit_id));
