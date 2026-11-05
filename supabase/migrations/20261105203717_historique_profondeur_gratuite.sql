-- U5 — gratuit : dernier audit terminé par site, Pro : historique complet.
-- À valider par le propriétaire AVANT déploiement. Ne pas appliquer en prod
-- sans son accord. Aucun effacement ; un upgrade Pro rend les anciens visibles.
-- Les audits queued/running restent lisibles pour /progression (polling du job).
-- Dernier = created_at DESC, id DESC parmi done/partial/failed. Le lancement
-- d’un nouveau job ne retire donc pas le dernier rapport pendant son exécution.
create index audits_history_latest_idx
  on public.audits (site_id, created_at desc, id desc)
  where status in ('done', 'partial', 'failed');

-- SECURITY DEFINER privé : évite la récursion RLS sur audits, ne fait confiance
-- ni au JWT user_metadata ni au plan envoyé par le navigateur. L’appartenance
-- reste contrôlée ici ET par les politiques permissives existantes.
create or replace function private.history_audit_readable(p_audit_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audits as a
    join public.sites as s on s.id = a.site_id
    join public.profiles as p on p.id = s.owner_id
    where a.id = p_audit_id
      and s.owner_id = (select auth.uid())
      and (
        p.plan = 'pro'
        or a.status in ('queued', 'running')
        or a.id = (
          select latest.id from public.audits as latest
          where latest.site_id = a.site_id
            and latest.status in ('done', 'partial', 'failed')
          order by latest.created_at desc, latest.id desc
          limit 1
        )
      )
  );
$$;
revoke all on function private.history_audit_readable(uuid) from public, anon;
grant execute on function private.history_audit_readable(uuid) to authenticated, service_role;

-- RESTRICTIVE = AND des droits existants (propriété + domaines vérifiés),
-- jamais une politique permissive qui rendrait les autres audits accessibles.
create policy audits_history_depth on public.audits
  as restrictive for select to authenticated
  using (private.history_audit_readable(id));

create policy domain_scores_history_depth on public.domain_scores
  as restrictive for select to authenticated
  using (private.history_audit_readable(audit_id));

create policy findings_history_depth on public.findings
  as restrictive for select to authenticated
  using (private.history_audit_readable(audit_id));

create policy artifacts_history_depth on public.artifacts
  as restrictive for select to authenticated
  using (private.history_audit_readable(audit_id));

create policy reports_history_depth on public.reports
  as restrictive for select to authenticated
  using (private.history_audit_readable(audit_id));

-- Un INSERT manuel ne doit pas créer un nouveau snapshot d’un ancien audit
-- (les liens déjà émis conservent leur durée/révocation habituelle).
create policy reports_history_depth_insert on public.reports
  as restrictive for insert to authenticated
  with check (private.history_audit_readable(audit_id));

-- Fermer aussi le helper de note SECURITY DEFINER. read_rapport_apercu est
-- SECURITY INVOKER : sa lecture audits est déjà soumise à la nouvelle RLS.
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
    and s.owner_id = (select auth.uid())
    and private.history_audit_readable(a.id);
$$;

revoke all on function private.note_si_verifie(uuid) from public, anon;
grant execute on function private.note_si_verifie(uuid) to authenticated, service_role;
