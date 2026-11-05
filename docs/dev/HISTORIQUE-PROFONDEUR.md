# Historique : profondeur du compte gratuit (U5)

Règle : FONCTIONNEMENT § compte (« dernier rapport par site, profondeur 1 »),
MATRICE-STATUT-DROITS-CANON (« historique long » en extra Pro). Le 5 novembre,
le propriétaire a demandé son application immédiate, y compris aux exports.

- Gratuit/non-Pro : dernier audit terminé par site uniquement. Ordre stable :
  `created_at DESC, id DESC`, parmi `done`, `partial`, `failed`.
- Pro : rien ne change, tous les audits restent disponibles.
- `queued`/`running` restent accessibles au propriétaire : `/progression` suit
  le job courant, sans courbe d’anciens audits. Le dernier rapport n’est pas
  masqué pendant l’exécution d’un nouveau job. Après un échec, on ne rouvre
  pas un ancien rapport implicitement.
- `/historique` : table/CSV/PDF sur ce même dernier audit ; courbes et contrôles
  de période remplacés par un appel Pro FR/EN. Pro garde courbes, Excel, JSON.
- Le client limite la requête et filtre avant de charger notes/domaines/constats.
  Profil inconnu ou indisponible = profondeur gratuite (échec fermé).

## Contrôle serveur et déploiement

**Migration requise, NON appliquée en production :
`20261105203717_historique_profondeur_gratuite.sql`. Accord explicite du
propriétaire requis avant application en production.**

Elle ajoute des politiques SELECT *restrictives* (AND des règles existantes)
sur audits, domain_scores, findings, artifacts, reports. Un helper privé
SECURITY DEFINER lit le vrai `profiles.plan`, vérifie la propriété et calcule
le dernier audit sans récursion. Le RPC `read_rapport_apercu` reste invoker ;
le helper de note definer est fermé lui aussi. Une requête manuelle ou un ID
ancien ne contourne pas la profondeur. Les domaines réservés à la propriété
vérifiée restent réservés : cette migration ne donne aucun droit nouveau.

Pas de suppression de données. Les workers/service_role gardent leur accès ;
un passage à Pro réouvre l’historique, une rétrogradation le referme.
La création de nouveaux liens passe par le client de session/RLS (et INSERT
reports est restreint aussi). Les liens publics/partagés existants restent des
snapshots explicites, jamais un accès
à l’historique du propriétaire. L’export de données personnelles de `/compte`
(RGPD, différent de l’export produit `/historique`) reste complet : ce droit
ne dépend pas d’un abonnement.

Déployer migration approuvée + code ensemble. Sans la migration, le miroir UI
limite bien la page et ses exports, mais ne constitue pas une barrière contre
une requête directe : ne pas annoncer le contrôle serveur actif en prod.
