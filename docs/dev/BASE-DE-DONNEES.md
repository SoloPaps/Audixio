# Base de données — cœur produit (brique 1)

Schéma local Supabase. Décisions : [00-DECISIONS.md](../00-DECISIONS.md). Droits : [MATRICE-STATUT-DROITS-CANON.md](../produit/MATRICE-STATUT-DROITS-CANON.md).

Rien n’est appliqué sur un projet distant. Aucune clé dans le dépôt.

## Appliquer les migrations

En local, avec Docker :

```bash
supabase start
supabase db reset --local
```

`db reset` rejoue `supabase/migrations/` puis `supabase/seed.sql`. Ne pas utiliser `supabase link`, `db push` ni `--linked`.

Les tests RLS (`packages/db/test/rls.test.ts`) démarrent le stack local et rejouent ce reset.

## Tables touchées par cette brique

| Table | Rôle |
|---|---|
| `profiles` | `onboarding_vu` (accueil une fois), `plan` `free` ou `pro` |
| `sites` | Sites suivis. Plafond 2 (free) / 10 (pro) calculé par le module de droits, pas encore refusé à l'insertion |
| `site_verifications` | Preuve par site : `pending`, `verified`, `failed`, `expired` |
| `audits`, `domain_scores`, `findings` | Rapport. Colonne générée `grade` (A–F) |
| `action_plan_items` | Statut de tâche par compte et par site (`todo`, `doing`, `done`, `auto_closed`) |
| `alert_settings` | Cadence de ré-audit, délai certificat, seuil de baisse |

Méthodes de preuve acceptées en base : `file` (fichier HTML déjà sondé), `html_file`, `meta`, `well_known`, `dns_txt`, `search_console`. Le moteur ne sonde encore que `file`, `meta` et `dns_txt`.

## Qui voit quoi

RLS sur chaque table. `auth.uid()` est enveloppé dans `(select auth.uid())`. Chacun lit ses lignes.

Soft-gate, appliqué dans les politiques (pas dans le navigateur) :

- Sans preuve sur **ce** site, `findings` et `domain_scores` des domaines `securite`, `vie_privee`, `dns_email` ne sont pas lisibles.
- Les artefacts (JSON complet) non plus.
- `read_rapport_apercu(audit_id)` renvoie l’aperçu : domaines ouverts, pastilles verrouillées sans lettre, constats ouverts. La note globale et le correctif branché ne sont présents que si une preuve `verified` existe.
- Libellé sans preuve : `partielle · N domaines · site non vérifié` (N = domaines ouverts notés).
- Un lien public (`read_public_score`, `read_shared_score`) ne reçoit ni note globale, ni domaine sensible, ni constat. L’ancien drapeau `expose_security` ne rouvre pas ces données.
- Le plan Pro ne remplace pas la preuve. Il change le plafond et les alertes.

`plan` n’a pas de droit `UPDATE` pour `authenticated`. `onboarding_vu` oui.

Alertes : à la création, free = mensuel et certificat 14 j ; pro = hebdomadaire. Un compte free qui écrit une autre cadence est ramené aux défauts (trigger). Le Pro peut choisir `daily`, `weekly` ou `monthly`, un délai de 1 à 90 jours et un seuil de 0 à 40 points (0 = changement de lettre).

Le plan d’action : le client pose `todo`, `doing` ou `done`. `auto_closed` est réservé au service, quand le constat disparaît au ré-audit (pas encore branché).

Le module TypeScript `@audigy/db` (`packages/db/src/droits.ts`) reprend la même matrice pour les fonctions. Les tests unitaires sont dans `packages/db/test/droits.test.ts`.

## Ce qui reste

- L’écran lit encore `audits.global_score` en direct. La colonne existe pour le propriétaire. Le hub devra passer par `read_rapport_apercu` avant de retirer ce droit.
- Le planificateur lit `schedules` (`weekly` / `monthly`), pas encore `alert_settings` ni `daily`.
- Plafonds (2 sites, 1 lien en gratuit ; 10 sites en Pro) : fonctions `withinSiteQuota` et `withinLinkQuota`. Pas de trigger : un audit crée encore une ligne par adresse, et un rapport peut être à la fois `public` et `link`.
- Sondes `.well-known`, fichier alias `html_file`, Search Console.
- Fermeture automatique des tâches quand le constat disparaît.
- Lien équipe distinct du lien public (`reports.visibility` reste `link`).
