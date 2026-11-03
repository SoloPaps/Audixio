# Revue de sécurité — 3 novembre 2026

Lecture du code (auth, RLS, fonctions `SECURITY DEFINER`, soft-gate, fonctions Netlify, liens, en-têtes, cookies, XSS, secrets, dépendances, courriels, journaux). Aucun accès au projet Supabase distant. Aucune migration créée ni appliquée. Le design n’a pas été touché.

`supabase/migrations/20261103061242_liens_partage.sql` a été renommé en `supabase/migrations/20261103064721_liens_partage.sql`. Le SQL est inchangé. Cette version est déjà en production. Ne pas la rejouer.

## Tableau

| Risque | Gravité | Preuve | Correctif | Statut |
|---|---|---|---|---|
| Course sur les plafonds « lieux » et « compte » : lecture puis écriture, deux appels parallèles passent tous les deux | Moyenne | `takePlacesSlot` et `takeAccountSlot` faisaient `select` puis `upsert`. `packages/orchestrator/test/rate-slot.test.ts` : 2 succès sur 2 avant le correctif, 1 sur 2 après | Les deux appellent `public.consume_rate_limit` (déjà atomique, `search_path` vide, `service_role` seul) | Corrigé |
| L’adresse IP des plafonds suivait `X-Forwarded-For`, que le client peut inventer | Moyenne | `clientIp` dans `packages/db/src/abus.ts`. Les plafonds auth, formulaires et audits s’en servent. Le plafond par e-mail restait, le plafond IP non | Seul `x-nf-client-connection-ip` (posé par Netlify) est lu. Sinon `local` | Corrigé |
| Retour OAuth : un `%` mal formé dans le cookie `audixio_next` lève `URIError` ; un `%` décodé peut ouvrir `//hôte` | Moyenne | `decodeURIComponent` direct dans le callback. `safeNextPath('/%')` renvoyait `/%` | `safeNextPath` refuse `%`. `readStoredNext` attrape l’erreur de décodage et retombe sur `/sites` | Corrigé |
| Mot de passe local : GoTrue à 8 caractères, l’application exige 10. `secure_password_change` était faux | Moyenne en local. Le fichier ne change pas le projet hébergé | `supabase/config.toml` contre `PASSWORD_MIN` dans `packages/db/src/auth-policy.ts` | Local : longueur 10, `secure_password_change = true`. `otp_expiry` était déjà 900 (15 min) | Corrigé en local. Prod : action propriétaire |
| Les journaux ne masquaient pas les adresses e-mail | Moyenne | `redact` dans `packages/orchestrator/src/log.ts` | Motif e-mail ajouté aux masques (jetons, JWT, clés déjà masqués, dont le jeton de partage 32 hex) | Corrigé |
| Retour chariot ou saut de ligne dans destinataire, objet, lien de désinscription ou expéditeur | Moyenne | `createBrevoMailer.send` envoyait ces champs tels quels à l’API JSON Brevo | Refus `mail_header` avant l’appel. Le lien de désinscription reste signé (HMAC, comparaison en temps constant) | Corrigé |
| `glob` 9–14.0.1 (GHSA-3g3m-2fjr-6pw4), tiré par Lighthouse → plugin Sentry, outil de build seulement | Moyenne | `pnpm audit` avant correctif | Override `glob@<14.0.2` → `14.0.2`. `scripts/deps-audit.test.ts` | Corrigé |
| `anon` peut lire toutes les colonnes de `public.sites` et `public.reports` quand la ligne est publique : `owner_id`, `share_token` | Moyenne | `grant select on public.sites to anon` et `grant select on public.reports to anon` (`20261101191806_init.sql`). Politiques `sites_select_anon`, `reports_select_anon`. Les pages publiques passent par les RPC, pas par ces tables | SQL ci-dessous. Pas appliqué : consigne de ne pas créer de migration | À appliquer par le propriétaire |
| Un compte connecté peut lire les sites publics des autres (`owner_id`) et les rapports `visibility = public` (`share_token`) | Moyenne | Politiques `sites_select` et `reports_select` : propriétaire **ou** ligne publique. Un droit de colonne ne peut pas dépendre de la ligne | SQL optionnel ci-dessous. L’interface propriétaire et le test RLS « anon ne reçoit que sites et reports » sont à revoir en même temps. La note publique passe déjà par `read_public_score` / `read_shared_score` | À appliquer par le propriétaire, après relecture |
| `deepmerge` 4.2.0–4.3.1 (GHSA-gcqx-w48m-2h4j), chaîne Astro → Svelte, build seulement. Aucune version corrigée publiée | Faible | `pnpm audit` : 1 faible restante | Aucun correctif en amont | Accepté |
| `GET /api/auth/session` renvoie `access_token` au JavaScript. `refresh_token` est vide | Faible | `packages/db/src/auth-http.ts`. Le jeton dure 1 h. Les cookies de session sont `httpOnly`, `SameSite=Lax`, `secure` si l’URL est https | Non retiré : le client s’en sert. CSP sans `unsafe-inline` sur les scripts | Accepté |
| `set:html={JSON.stringify(...)}` n’échappe pas `<`. Pas de `{@html}` | Faible | Pages i18n / JSON-LD. Dictionnaires statiques, pas de texte visiteur. La prop `jsonLd` n’a pas d’appelant | Aucun changement | Accepté |
| HSTS sans `preload`. `Permissions-Policy` ne liste pas tous les capteurs | Faible | `netlify.toml` : `max-age=63072000; includeSubDomains`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, caméra / micro / géoloc. CSP écrite au build (`scripts/publish-policy.ts`) : scripts à hash, `frame-ancestors 'none'` | `preload` non ajouté : il casse un sous-domaine encore en HTTP | Accepté |
| `connect-src` de la CSP autorise `http://localhost:54321` | Faible | Build local et CI | Utile au dev. Pas de secret dedans | Accepté |

## Déjà en place (relu, pas de faille nouvelle)

- SSRF : `packages/net` (`safeFetch`, épingle d’adresse). Bloque privé, lien-local, métadonnées, CGNAT, IPv6 mappé, IPv4 lâche, identifiants dans l’URL, ports autres que 80/443. Les redirections sont revérifiées. Les API externes sont en liste d’hôtes HTTPS. Les URL d’audit passent par `normalizeSiteUrl`. Pas de `fetch` direct dans `netlify/functions`.
- RLS actif sur les tables `public`. `oauth_tokens` et `rate_limits` : aucun droit pour `anon` ni `authenticated`. Fonctions `SECURITY DEFINER` relues avec `search_path = ''`. `consume_rate_limit`, `claim_next_audit`, `prepare_site_verification`, `consume_verification_probe` : `service_role` seul. Schéma `private` hors API (`public` seulement). `user_metadata` n’autorise rien.
- Soft-gate : ouverts Perf, SEO, Éco, Qualité, A11y ; verrouillés Sécurité, Vie privée, DNS tant que le site n’est pas vérifié. Filtre serveur (`packages/db/src/droits.ts`) et RLS. Les RPC publiques vident la note globale et les domaines verrouillés.
- Liens : jeton 128 bits, expiration et révocation dans `20261103064721_liens_partage.sql` (déjà en prod). Jeton hors URL en POST, empreinte SHA-256, possession vérifiée. Les journaux portent des identifiants, pas le jeton.
- Désinscription : HMAC SHA-256, `timingSafeEqual`. GET affiche, POST applique.
- Pas de `service_role` dans `apps/web`. Config publique : URL + clé `anon`.
- Cookies de session `httpOnly`. `audixio_connecte` est un drapeau, pas un secret.
- Rotation du jeton quand un rapport passe en lien. Un jeton de ligne `public` ne suffit pas à `read_shared_score` (il exige `visibility = link`).

## SQL à appliquer par le propriétaire

Ne pas le coller dans une migration de cette PR. Le coller dans le SQL editor du projet, ou dans une migration séparée après relecture.

Retrait du droit `anon` sur les deux tables. Les pages publiques restent sur les RPC (`read_public_score`, `read_shared_score`, `read_report_by_share_token`).

```sql
revoke select on table public.sites from anon;
revoke select on table public.reports from anon;
```

Option, plus stricte. Un visiteur connecté ne lit plus les lignes publiques des autres via la table. À valider avec l’écran Sites et le test RLS avant de l’exécuter.

```sql
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
```

## Actions propriétaire

1. Tableau de bord Supabase (Auth, projet hébergé) : longueur minimale du mot de passe à 10 ; activer « Secure password change ». `config.toml` ne pousse pas ces réglages. Vérifier qu’une réinitialisation depuis un lien frais fonctionne encore (une session de recovery de moins de 24 h peut changer le mot de passe sans nonce).
2. Exécuter le `revoke` ci-dessus. Le second bloc seulement après relecture.
3. `supabase migration list` doit montrer 12 versions des deux côtés, dont `20261103064721`. Ne pas `db push` cette migration. Ne pas `migration repair`.
4. Une base Docker locale encore sur l’ancien préfixe : `supabase db reset --local` seulement. Jamais sur le projet distant.
5. `deepmerge` : rien à faire tant qu’aucune version corrigée n’existe. Outil de build, pas le navigateur des visiteurs.
