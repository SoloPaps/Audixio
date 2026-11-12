# Audixio v6 : structure du site (validée par l'owner le 12/11/2026)

Ce fichier est la référence pour les lots 2 à 4. Une ancienne adresse n'est retirée que si sa redirection 301 existe et qu'un test la couvre.

## 1. Navigation

| Visiteur (dans l'ordre) | Adresse |
|---|---|
| Comment ça marche | `/methode` |
| Exemple de rapport | `/exemple-rapport` |
| Tarifs | `/pro` |
| FR \| EN, thème | (outils) |
| Connexion | `/connexion` |
| **Scanner mon site** (bouton principal) | `/#scan` (formulaire du héros de l'accueil) |

| Connecté | Adresse |
|---|---|
| Mes sites | `/sites` |
| Compte | `/compte` |
| FR \| EN, thème, Scanner mon site | comme pour le visiteur |

Le logo mène à `/`. Il n'y a plus d'entrée « Accueil ». Menu mobile : mêmes entrées, même ordre, dans la feuille ≤ 900 px. Les entrées viennent d'une seule source, `lib/nav-canon.ts` (`NAV_GUEST`, `NAV_MEMBER`), et un test compare les entrées FR et EN.

## 2. Pied de page (3 colonnes)

| Produit | Transparence | Légal |
|---|---|---|
| Comment ça marche `/methode` | Robot d'audit `/robot` | Mentions légales `/mentions-legales` |
| Exemple de rapport `/exemple-rapport` | Écoconception `/ecoconception` | CGU `/cgu` |
| Tarifs `/pro` | Accessibilité `/accessibilite` | Confidentialité `/confidentialite` |
| Scanner mon site `/#scan` | | Cookies `/cookies` |

## 3. Rapport : une adresse par audit, avec onglets

Nouvelle adresse : `/audit/:id`, avec un onglet par sous-chemin (le site statique sert `/audit/index.html` en réécriture 200, comme `/score/*` et `/partage/*`).

| Onglet | Adresse |
|---|---|
| Résumé | `/audit/:id` |
| Domaines | `/audit/:id/domaines` et `/audit/:id/domaines/:domaine` (précédent et suivant) |
| Constats | `/audit/:id/constats` et `/audit/:id/constats/:check` |
| Plan d'action | `/audit/:id/plan` |
| Brief IA | `/audit/:id/brief` |
| Impression / PDF | `/audit/:id/imprimer` |

Fil d'Ariane : Mes sites › `host` › onglet. Pour un visiteur sans compte : Accueil › `host` › onglet.

## 4. Une page par site

`/sites/:host` regroupe les audits, l'historique, la vérification de propriété et le partage, chacun dans sa section (`#audits`, `#historique`, `#verification`, `#partage`). La page des demandes reste `/sites/:host/demandes/:id`.

## 5. Compte

`/compte` contient trois sections : `#profil`, `#alertes` et `#abonnement`.

## 6. Partager

Un seul bouton « Partager » ouvre une feuille avec trois choix, chacun avec une phrase d'explication :
- **Lien public** : une page en lecture seule, sans les détails de sécurité (`/partage/:jeton`).
- **Badge** : la note à afficher sur votre site, avec un lien vers la page publique.
- **PDF** : le rapport complet, à envoyer ou à archiver.

## 7. Redirections 301 (ancienne → nouvelle)

Les paramètres non repris sont conservés tels quels. L'ancre est gardée par le navigateur.

| # | Ancienne adresse | Nouvelle adresse | Qui l'envoie aujourd'hui |
|---|---|---|---|
| R1 | `/rapport?id=:id` | `/audit/:id` | e-mail de fin d'audit (`privateReportUrl`), liens internes |
| R2 | `/rapport?id=:id&domaine=:d` | `/audit/:id/domaines/:d` | ReportView |
| R3 | `/rapport?id=:id&check=:c` | `/audit/:id/constats/:c` | ReportView |
| R4 | `/domaine?id=:id&domaine=:d` | `/audit/:id/domaines/:d` | liens internes |
| R5 | `/domaine?id=:id` | `/audit/:id/domaines` | liens internes |
| R6 | `/constat?id=:id&check=:c` | `/audit/:id/constats/:c` | liens internes |
| R7 | `/constat?id=:id` | `/audit/:id/constats` | liens internes |
| R8 | `/plan?id=:id` | `/audit/:id/plan` | liens internes |
| R9 | `/brief?id=:id` | `/audit/:id/brief` | liens internes |
| R10 | `/rapport/:id/imprimer` | `/audit/:id/imprimer` | export PDF |
| R11 | `/historique?site=:site` | `/sites/:host#historique` | liens internes (résolution id → host côté page, voir Q1) |
| R12 | `/verifier?site=:site` | `/sites/:host#verification` | liens internes (voir Q1) |
| R13 | `/badge?id=:id` | `/audit/:id?partager=badge` (ouvre la feuille Partager) | liens internes |
| R14 | `/passer-pro` (et `?…`) | `/pro` (requête gardée) | boutons Pro |
| R15 | `/compte/alertes` | `/compte#alertes` | e-mails d'alerte et de récap (`mail.ts`, `mail-templates.ts`) |
| R16 | `/progression?site=…&url=…` | inchangée | e-mail d'échec (`relaunchAuditUrl`) |
| R17 | `/partage/:jeton`, `/score/:x`, `/verifier/:id` | inchangées (liens publics à jeton, déjà diffusés) | partage, badge |

Mise en œuvre :
- Une seule table, `apps/web/src/lib/redirects.ts`. Le build écrit les règles Netlify (`_redirects`), avec la correspondance de requête : `/rapport id=:id /audit/:id 301`. Aucun déploiement ni lien Netlify.
- Le serveur e2e local applique la même table.
- Tests : un cas par ligne R1 à R17, en unitaire (table → adresse) et en e2e (statut 301 et `Location`). Les règles avec plusieurs paramètres passent avant les règles à un paramètre.
- Les e-mails et les liens internes produisent directement les nouvelles adresses. Les anciennes ne servent plus qu'aux liens déjà envoyés.

## 8. Ce qui reste à trancher

- **Q1, `/sites/:host` ou `/sites/:id` :** les liens actuels portent l'identifiant du site (`?site=`), pas son nom de domaine. Une règle 301 statique ne peut pas passer de l'un à l'autre. Il y a deux options :
  - (a) `/sites/:host`, plus lisible. R11 et R12 passent alors par une page de résolution qui lit le site puis remplace l'adresse.
  - (b) `/sites/:id`, avec un 301 statique pur.
  
  Aucune des deux ne touche la base. Je propose (a).
- **Q2, `/audit/:id` ou garder `/rapport/:id` :** `/rapport/:id` garderait le mot connu des utilisateurs, mais l'adresse change de toute façon. Je propose `/audit/:id`.
- **Aucune migration de base n'est prévue.** Si une évolution en demande une (par exemple un champ « host » unique par compte pour Q1-a), elle attendra le oui de l'owner.

## 9. Découpage

- **Lot 2 (PR accueil) :** la nav visiteur et la nav connecté, le bouton « Scanner mon site », le pied de page en 3 colonnes, et R14 (`/passer-pro` → `/pro`).
- **Lot 3 :** le rapport à onglets (`/audit/:id`) et les redirections R1 à R10 et R13, avec la feuille Partager.
- **Lot 4 :** la page par site, le compte en sections, et les redirections R11, R12 et R15.
