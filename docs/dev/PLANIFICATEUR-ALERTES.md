# Planificateur des alertes et récap du lundi

Le cron est déjà dans le dépôt. Il ne part qu’au déploiement de production (PART-27, owner). Aucune migration à appliquer pour cette brique.

## Ce qu’il fait

Toutes les 15 minutes, `schedule-tick` :

- lit les sites suivis ;
- lit `alert_settings` s’il y a une ligne, sinon applique les mêmes défauts que `ensure_alert_settings` (gratuit : mensuel, certificat 14 jours, seuil = lettre qui baisse ; Pro : hebdomadaire, mêmes délais, modifiables) ;
- ne ré-audite pas un site sans preuve `verified`, ni un site qui a déjà un audit en cours ;
- met un audit **passif** en file quand la cadence est échue (`request_audit` : plafond du jour, 15 minutes par hôte) ;
- sonde la disponibilité (deux échecs de suite, puis le retour) ;
- envoie une alerte si la note baisse, si un constat grave est nouveau, ou si le certificat entre dans le délai ;
- n’envoie pas deux fois le même événement (même clé `dedup`).

Le lundi à 8 h, heure de Paris, `digest-weekly` envoie le récap (`renderDigest`) aux comptes qui ont le résumé activé, au moins un site vérifié, et qui ne se sont pas désabonnés. Semaine sans changement : « Rien n’a changé cette semaine », avec le rappel des notes. Un seul envoi par personne et par semaine.

Les gabarits d’inscription GoTrue restent dans `supabase/templates/`. Le récap et les alertes utilisent `renderDigest` / `renderAlert`.

`ensure_alert_settings` exige un utilisateur connecté (`auth.uid()`). Le cron tourne avec la clé `service_role`, donc il **lit** la table et **ne crée pas** la ligne. La ligne apparaît quand la personne ouvre ses réglages. Avant ça, les défauts ci-dessus s’appliquent quand même.

## Activer (owner, une fois, en production)

1. Déployer le site (PART-27). Ne pas lancer `netlify deploy` depuis un agent.
2. Dans Netlify, vérifier que les fonctions planifiées sont visibles :
   - `schedule-tick` : `*/15 * * * *`
   - `digest-weekly` : `0 6,7 * * 1` (6 h et 7 h UTC le lundi ; une seule des deux tombe à 8 h à Paris)
3. Variables, dans l’interface Netlify, jamais dans le dépôt :
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL` (origine https du site, pour les liens et le désabonnement)
   - `BREVO_API_KEY` (sans cette clé, aucun e-mail ne part)
4. Premier contrôle : le journal de `schedule-tick` répond en JSON (`probed`, `enqueued`, `alerts`). Le récap du lundi suivant part tout seul.

## En local

Les fonctions planifiées ne tournent pas toutes seules.

```bash
netlify functions:invoke schedule-tick
netlify functions:invoke digest-weekly --query run=1
```

Sans `BREVO_API_KEY`, l’invoke ne contacte pas Brevo. Les tests utilisent un envoi simulé et, contre la base locale, vérifient que Mailpit n’a rien reçu pour ces adresses.
