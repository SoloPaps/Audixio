-- Cœur produit, brique 1 : profil, preuves, notes A–F, plan d'action,
-- réglages d'alertes, soft-gate partiel côté serveur.
-- Matrice : docs/produit/MATRICE-STATUT-DROITS-CANON.md
-- Aucun secret. Aucun projet distant.

-- ---------------------------------------------------------------------------
-- Note A–F (mêmes seuils que apps/web/src/lib/grade.ts).
-- ---------------------------------------------------------------------------

create or replace function private.note_lettre(p_score integer)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p_score is null then null
    when p_score >= 90 then 'A'
    when p_score >= 80 then 'B'
    when p_score >= 65 then 'C'
    when p_score >= 50 then 'D'
    when p_score >= 35 then 'E'
    else 'F'
  end;
$$;

revoke all on function private.note_lettre(integer) from public, anon, authenticated;

alter table public.audits
  add column grade text generated always as (private.note_lettre(global_score)) stored;

alter table public.audits
  add constraint audits_grade check (
    grade is null or grade in ('A', 'B', 'C', 'D', 'E', 'F')
  );

alter table public.domain_scores
  add column grade text generated always as (private.note_lettre(score)) stored;

alter table public.domain_scores
  add constraint domain_scores_grade check (
    grade is null or grade in ('A', 'B', 'C', 'D', 'E', 'F')
  );

comment on column public.audits.grade is
  'Lettre A–F dérivée du score. La note globale ne sort dans read_rapport_apercu que si le site est vérifié.';

-- ---------------------------------------------------------------------------
-- Profil : accueil vu une fois, offre free ou pro.
-- plan n'est pas modifiable par le client (pas de GRANT UPDATE).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column onboarding_vu boolean not null default false,
  add column plan text not null default 'free';

alter table public.profiles
  add constraint profiles_plan check (plan in ('free', 'pro'));

comment on column public.profiles.onboarding_vu is
  'Vrai dès le premier affichage de la page Bienvenue. Ne se réaffiche plus.';
comment on column public.profiles.plan is
  'free ou pro. Écrit par service_role seulement (liste d''attente, pas Stripe).';

grant select (onboarding_vu, plan) on public.profiles to authenticated;
grant update (onboarding_vu) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Preuves. file = fichier HTML déjà sondé. Les trois autres sont stockées
-- pour la brique suivante (pas encore sondées par le moteur).
-- ---------------------------------------------------------------------------

alter table public.site_verifications
  drop constraint site_verifications_method;

alter table public.site_verifications
  add constraint site_verifications_method check (
    method in (
      'dns_txt',
      'file',
      'html_file',
      'meta',
      'well_known',
      'search_console'
    )
  );

create index site_verifications_verified_idx
  on public.site_verifications (site_id)
  where status = 'verified';

-- ---------------------------------------------------------------------------
-- Domaines verrouillés tant que la propriété de CE site n'est pas prouvée.
-- Sécurité, vie privée, DNS : pas de lettre, pas de constat.
-- ---------------------------------------------------------------------------

create or replace function private.domain_locked(p_domain text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_domain in ('securite', 'vie_privee', 'dns_email');
$$;

create or replace function private.site_verified(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_verifications as v
    where v.site_id = p_site_id
      and v.status = 'verified'
  );
$$;

create or replace function private.audit_verified(p_audit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audits as a
    join public.site_verifications as v on v.site_id = a.site_id
    where a.id = p_audit_id
      and v.status = 'verified'
  );
$$;

revoke all on function private.domain_locked(text) from public, anon;
revoke all on function private.site_verified(uuid) from public, anon;
revoke all on function private.audit_verified(uuid) from public, anon;
grant execute on function private.domain_locked(text) to authenticated, service_role;
grant execute on function private.site_verified(uuid) to authenticated, service_role;
grant execute on function private.audit_verified(uuid) to authenticated, service_role;

drop policy if exists domain_scores_select on public.domain_scores;
create policy domain_scores_select on public.domain_scores
for select to authenticated
using (
  (select private.owns_audit(audit_id))
  and (
    not (select private.domain_locked(domain))
    or (select private.audit_verified(audit_id))
  )
);

drop policy if exists findings_select on public.findings;
create policy findings_select on public.findings
for select to authenticated
using (
  (select private.owns_audit(audit_id))
  and (
    not (select private.domain_locked(domain))
    or (select private.audit_verified(audit_id))
  )
);

-- Le JSON d'artefact contient tous les domaines. Il ne sort pas sans preuve.
drop policy if exists artifacts_select on public.artifacts;
create policy artifacts_select on public.artifacts
for select to authenticated
using (
  (select private.owns_audit(audit_id))
  and (select private.audit_verified(audit_id))
);

create index findings_audit_domain_idx on public.findings (audit_id, domain);

-- ---------------------------------------------------------------------------
-- Plan d'action : statuts par compte et par site, conservés entre ré-audits.
-- auto_closed est posé par le service (ré-audit), pas par le client.
-- ---------------------------------------------------------------------------

create table public.action_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  check_id text not null,
  domain text not null,
  status text not null default 'todo',
  updated_at timestamptz not null default now(),
  constraint action_plan_items_check check (
    char_length(check_id) between 1 and 120
  ),
  constraint action_plan_items_domain check (
    domain in (
      'performance', 'seo', 'securite', 'ecologie', 'accessibilite',
      'qualite', 'vie_privee', 'dns_email', 'reputation', 'disponibilite'
    )
  ),
  constraint action_plan_items_status check (
    status in ('todo', 'doing', 'done', 'auto_closed')
  ),
  constraint action_plan_items_unique unique (user_id, site_id, check_id)
);

create index action_plan_items_site_idx on public.action_plan_items (site_id);
create index action_plan_items_user_idx on public.action_plan_items (user_id);

alter table public.action_plan_items enable row level security;

revoke all on public.action_plan_items from public, anon, authenticated;
grant select, insert, update, delete on public.action_plan_items to authenticated;
grant all on public.action_plan_items to service_role;

create policy action_plan_items_select on public.action_plan_items
for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
  and (
    not (select private.domain_locked(domain))
    or (select private.site_verified(site_id))
  )
);

create policy action_plan_items_insert on public.action_plan_items
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
  and status in ('todo', 'doing', 'done')
  and (
    not (select private.domain_locked(domain))
    or (select private.site_verified(site_id))
  )
);

create policy action_plan_items_update on public.action_plan_items
for update to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
  and (
    not (select private.domain_locked(domain))
    or (select private.site_verified(site_id))
  )
)
with check (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
  and status in ('todo', 'doing', 'done')
  and (
    not (select private.domain_locked(domain))
    or (select private.site_verified(site_id))
  )
);

create policy action_plan_items_delete on public.action_plan_items
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
);

-- ---------------------------------------------------------------------------
-- Réglages d'alertes par site.
-- Gratuit : mensuel, certificat 14 j, seuil = changement de lettre (0).
-- Pro : hebdo par défaut, quotidien / hebdo / mensuel, délai et seuil réglables.
-- ---------------------------------------------------------------------------

create table public.alert_settings (
  site_id uuid primary key references public.sites (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaudit_cadence text not null default 'monthly',
  ssl_warn_days integer not null default 14,
  score_drop_points integer not null default 0,
  alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint alert_settings_cadence check (
    reaudit_cadence in ('daily', 'weekly', 'monthly')
  ),
  constraint alert_settings_ssl check (ssl_warn_days between 1 and 90),
  constraint alert_settings_drop check (score_drop_points between 0 and 40)
);

create index alert_settings_user_idx on public.alert_settings (user_id);

comment on column public.alert_settings.score_drop_points is
  '0 = alerte seulement si la lettre baisse. Pro : seuil en points (1 à 40).';
comment on column public.alert_settings.ssl_warn_days is
  'Jours avant expiration du certificat TLS. Gratuit : 14, figé.';

create or replace function private.clamp_alert_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_plan text;
begin
  select s.owner_id into v_owner
  from public.sites as s
  where s.id = new.site_id;

  if v_owner is null or v_owner is distinct from new.user_id then
    raise exception 'site_interdit' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'user_interdit' using errcode = '42501';
  end if;

  select p.plan into v_plan
  from public.profiles as p
  where p.id = new.user_id;

  if v_plan is distinct from 'pro' then
    new.reaudit_cadence := 'monthly';
    new.ssl_warn_days := 14;
    new.score_drop_points := 0;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.clamp_alert_settings() from public, anon, authenticated;

create trigger alert_settings_clamp
  before insert or update on public.alert_settings
  for each row
  execute function private.clamp_alert_settings();

alter table public.alert_settings enable row level security;

revoke all on public.alert_settings from public, anon, authenticated;
grant select, insert, update on public.alert_settings to authenticated;
grant all on public.alert_settings to service_role;

create policy alert_settings_select on public.alert_settings
for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
);

create policy alert_settings_insert on public.alert_settings
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
);

create policy alert_settings_update on public.alert_settings
for update to authenticated
using (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.owns_site(site_id))
);

create or replace function private.ensure_alert_settings(p_site_id uuid)
returns setof public.alert_settings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan text;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.sites as s
    where s.id = p_site_id
      and s.owner_id = v_uid
      and s.deleted_at is null
  ) then
    raise exception 'site_interdit' using errcode = '42501';
  end if;

  select p.plan into v_plan
  from public.profiles as p
  where p.id = v_uid;

  insert into public.alert_settings (
    site_id, user_id, reaudit_cadence, ssl_warn_days, score_drop_points
  ) values (
    p_site_id,
    v_uid,
    case when v_plan = 'pro' then 'weekly' else 'monthly' end,
    14,
    0
  )
  on conflict (site_id) do nothing;

  return query
  select *
  from public.alert_settings as a
  where a.site_id = p_site_id
    and a.user_id = v_uid;
end;
$$;

revoke all on function private.ensure_alert_settings(uuid) from public, anon;
grant execute on function private.ensure_alert_settings(uuid) to authenticated, service_role;

create or replace function public.ensure_alert_settings(p_site_id uuid)
returns setof public.alert_settings
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.ensure_alert_settings(p_site_id);
$$;

revoke all on function public.ensure_alert_settings(uuid) from public, anon;
grant execute on function public.ensure_alert_settings(uuid) to authenticated, service_role;

-- Plafond 2 / 10 : module packages/db/src/droits.ts (withinSiteQuota).
-- Pas de trigger ici : chaque audit crée encore une ligne `sites`,
-- et le parcours actuel en enregistre plus de deux.

-- ---------------------------------------------------------------------------
-- Aperçu autorisé d'un audit. Security invoker : le RLS filtre déjà
-- les lignes sensibles. La note globale est annulée ici en plus.
-- ---------------------------------------------------------------------------

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

  select a.site_id, a.status, a.grade, a.global_score
  into v_site, v_status, v_grade, v_score
  from public.audits as a
  join public.sites as s on s.id = a.site_id
  where a.id = p_audit_id
    and s.owner_id = v_uid;

  if v_site is null then
    return null;
  end if;

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
  where f.audit_id = p_audit_id;

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

revoke all on function public.read_rapport_apercu(uuid) from public, anon;
grant execute on function public.read_rapport_apercu(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Lien public et page /score : soft-gate partiel pour le lecteur.
-- expose_security ne rouvre plus les constats (matrice du 28 oct. 2026).
-- La note globale n'est pas envoyée. Les domaines ouverts restent.
-- ---------------------------------------------------------------------------

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
    order by rep.visibility desc, rep.id
    limit 1
  ) as r on true
  where s.is_public
    and s.deleted_at is null
    and p_slug ~ '^[a-z0-9-]{8,64}$'
    and s.public_slug = p_slug;
$$;

create or replace function public.read_shared_score(p_token text)
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
  from public.reports as r
  join public.audits as a on a.id = r.audit_id
  join public.sites as s on s.id = a.site_id
  where r.visibility = 'link'
    and r.revoked_at is null
    and s.deleted_at is null
    and p_token ~ '^[0-9a-f]{32}$'
    and r.share_token = p_token;
$$;
