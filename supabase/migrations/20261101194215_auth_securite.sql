-- Auth : search_path figé, EXECUTE resserré, compteur de tentatives.
-- N'altère pas les migrations précédentes. Rien n'est poussé vers un projet distant.

-- Colonne générée : on ne remplace pas le corps, on fixe seulement le search_path.
alter function private.note_lettre(integer) set search_path = '';

revoke all on function private.note_lettre(integer) from public, anon, authenticated;

-- Relecture des fonctions security definer appelées par l'API.
-- search_path vide (déjà posé à la création, réaffirmé ici).
alter function public.read_public_score(text) set search_path = '';
alter function public.read_shared_score(text) set search_path = '';
alter function public.read_report_by_share_token(text) set search_path = '';
alter function public.list_my_oauth_connections() set search_path = '';

-- Page publique et lien : le visiteur (anon) et le compte (authenticated).
-- Le jeton ou le slug est la capacité. Pas d'autre rôle.
revoke all on function public.read_public_score(text) from public, anon, authenticated;
revoke all on function public.read_shared_score(text) from public, anon, authenticated;
revoke all on function public.read_report_by_share_token(text) from public, anon, authenticated;
grant execute on function public.read_public_score(text) to anon, authenticated, service_role;
grant execute on function public.read_shared_score(text) to anon, authenticated, service_role;
grant execute on function public.read_report_by_share_token(text) to anon, authenticated, service_role;

-- Liste OAuth : uniquement le compte connecté. anon ne l'exécute pas.
revoke all on function public.list_my_oauth_connections() from public, anon, authenticated;
grant execute on function public.list_my_oauth_connections() to authenticated, service_role;

-- Compteur d'auth. La clé est déjà une empreinte. service_role seulement.
create or replace function public.consume_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_key is null
    or p_key !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit < 1
    or p_limit > 1000
    or p_window_start is null
  then
    return false;
  end if;
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = r.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, timestamptz, integer) to service_role;
