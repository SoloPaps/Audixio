-- Durcissement RLS (audit du 2026-10-31).
-- 1. audits : plus d'INSERT direct (contournait les quotas de request_audit).
-- 2. sites : UPDATE limité aux colonnes d'affichage (url/host figés).
drop policy if exists audits_insert on public.audits;
revoke insert on public.audits from authenticated;

revoke update on public.sites from authenticated;
grant update (label, is_public, public_slug, deleted_at)
  on public.sites to authenticated;
