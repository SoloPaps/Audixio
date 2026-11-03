# Alignement des migrations (prod ↔ dépôt)

Lu le 3 novembre 2026 sur le projet `pzholfyjwanmkkfggsfe` avec `list_migrations`. Aucune écriture distante. Le tableau `supabase_migrations.schema_migrations` a les colonnes `version`, `statements`, `name`, `created_by`, `idempotency_key`, `rollback`. Pas de colonne de somme de contrôle : `db push` compare les versions, pas le SQL déjà enregistré.

Les 11 fichiers du dépôt ont été appliqués en production via l’API (`created_by` = `audixio@outlook.fr`), qui a gravé un nouvel horodatage à chaque appel (environ 5 secondes d’écart le 1er novembre 2026, 19:18 UTC, puis deux plus tard). Le SQL stocké est une seule instruction par version. Son MD5 est celui du fichier du dépôt, octets compris (les accents UTF-8 expliquent que `length()` en caractères soit plus court que la taille du fichier).

## Dépôt avant alignement et production

| Nom | Version dépôt (avant) | Version prod | MD5 du SQL | Écart |
|---|---|---|---|---|
| init | `20261023210000` | `20261101191806` | `a5257d23c34d0adc843f47755b52c890` | version seule |
| orchestration | `20261024000000` | `20261101191812` | `3a45e1799516144bf3e0455589074459` | version seule |
| verification_created_at | `20261024120000` | `20261101191817` | `bc5b6727b6b887facd5e0214e3379bb3` | version seule |
| places | `20261024180000` | `20261101191822` | `e89e025bfa91ef413ea36e33e65db867` | version seule |
| schedule | `20261024183000` | `20261101191827` | `f9f8656fd4707b82a976e795112b9c37` | version seule |
| public_score | `20261024233000` | `20261101191833` | `723503af7e71f224b72efa8ede277ba9` | version seule |
| request_audit_in_progress | `20261025220000` | `20261101191838` | `7ab311606a8faeac18784ef6c1b28251` | version seule |
| durcissement_rls | `20261031190000` | `20261101191844` | `f013bdcf149c47af6e0fa771b5be37e6` | version seule |
| coeur_droits | `20261101181500` | `20261101191850` | `92ba1fa4e757faeacf4af52937365d29` | version seule |
| auth_securite | `20261101194215` | `20261101205211` | `7a445ea7e6197a4732d572374c3d44e8` | version seule |
| preuves_note | `20261101213000` | `20261101223145` | `86c75cdb2c76bcaf2a84cb632993c41b` | version seule |

## Écarts

- Versions : les 11 préfixes du dépôt ne figuraient pas dans l’historique distant. Un `supabase db push` les aurait rejoués (objets déjà là : échec, ou doublon si le SQL est idempotent) et se serait arrêté parce que les versions distantes étaient absentes du dossier local.
- Contenu : identique. Rien à réécrire.
- Fichiers manquants à récupérer : aucun. Les 11 noms prod existent dans le dépôt.
- Migrations du dépôt absentes de la prod : aucune, une fois les fichiers renommés. Avant le renommage, les 11 fichiers auraient été vus comme nouveaux à cause du préfixe, avec le risque ci-dessus (rejeu sur un schéma déjà créé).

## Ce qui a été fait dans le dépôt

Renommage seul (le SQL n’a pas changé), pour que le préfixe soit la version déjà enregistrée :

- `20261023210000_init.sql` → `20261101191806_init.sql`
- `20261024000000_orchestration.sql` → `20261101191812_orchestration.sql`
- `20261024120000_verification_created_at.sql` → `20261101191817_verification_created_at.sql`
- `20261024180000_places.sql` → `20261101191822_places.sql`
- `20261024183000_schedule.sql` → `20261101191827_schedule.sql`
- `20261024233000_public_score.sql` → `20261101191833_public_score.sql`
- `20261025220000_request_audit_in_progress.sql` → `20261101191838_request_audit_in_progress.sql`
- `20261031190000_durcissement_rls.sql` → `20261101191844_durcissement_rls.sql`
- `20261101181500_coeur_droits.sql` → `20261101191850_coeur_droits.sql`
- `20261101194215_auth_securite.sql` → `20261101205211_auth_securite.sql`
- `20261101213000_preuves_note.sql` → `20261101223145_preuves_note.sql`

Les chemins cités dans les tests et les docs suivent ces noms. L’ordre d’application reste le même.

Une base locale qui a déjà appliqué les anciens préfixes ne correspond plus. La remettre d’aplomb : `supabase db reset --local` (cela efface la base Docker locale). Ne pas faire ce reset sur le projet distant.

## Commande du propriétaire

À lancer depuis la racine du dépôt, après relecture de la PR, et seulement par le propriétaire. Cela n’a pas été exécuté ici.

```bash
supabase link --project-ref pzholfyjwanmkkfggsfe
supabase migration list
supabase db push
```

`migration list` doit montrer les 11 versions déjà présentes des deux côtés, et une seule migration locale en attente : `20261103061242_liens_partage.sql` (`link_kind`, `expires_at`, `created_at` sur `reports`). `db push` n’applique que celle-là.

Ne pas utiliser `supabase migration repair` pour réécrire l’historique distant : les versions prod sont la référence, le dépôt s’y est calé.

## Risques de la migration nouvelle

- Elle ajoute trois colonnes sur `public.reports`, reprend `kind`, `expires_at` et la date depuis `audit_log` (`action = 'share_link'`, `target` = id du rapport) tant que `link_kind` est vide, puis refuse un `link_kind` hors `public` / `team` / null.
- `read_shared_score` et `read_report_by_share_token` ne renvoient plus rien si `revoked_at` est posé ou si `expires_at <= now()`. Une échéance vide (`null`, lien ancien ou lien équipe sans durée) reste lisible, comme aujourd’hui dans l’application.
- Le corps soft-gate de `read_shared_score` ne change pas (pas de note globale, pas de domaine verrouillé). Le rapport équipe complet reste servi par l’application, pas par cette fonction.
- Les politiques RLS et les droits existants ne sont pas modifiés. Les fonctions gardent `search_path` vide et les mêmes `grant execute`.
- Un `expires_at` illisible dans le journal est ignoré (la ligne n’est pas datée) plutôt que de faire échouer toute la migration. Un `kind` inconnu n’est pas recopié.
- Les liens créés après coup écrivent `link_kind`, `expires_at` et `created_at` dans `mint` (`packages/orchestrator/src/liens-db.ts`). Sans ces colonnes, un lien public expiré resterait lisible par l’ancienne fonction jusqu’à la révocation.
