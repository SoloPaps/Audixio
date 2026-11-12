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
| **Scanner mon site** (bouton principal) | `/#audit-form` (formulaire du héros de l'accueil, ancre déjà utilisée par les e-mails et la progression) |

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
| Scanner mon site `/#audit-form` | | Cookies `/cookies` |

## 3. Rapport : une adresse par audit, avec onglets

Nouvelle adresse : `/rapport/:id` (le mot connu des utilisateurs), avec un onglet par sous-chemin. Le site statique sert `/rapport/index.html` en réécriture 200, comme `/score/*` et `/partage/*`.

| Onglet | Adresse |
|---|---|
| Résumé | `/rapport/:id` |
| Domaines | `/rapport/:id/domaines` et `/rapport/:id/domaines/:domaine` (précédent et suivant) |
| Constats | `/rapport/:id/constats` et `/rapport/:id/constats/:check` |
| Plan d'action | `/rapport/:id/plan` |
| Brief IA | `/rapport/:id/brief` |
| Impression / PDF | `/rapport/:id/imprimer` |

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
| R1 | `/rapport?id=:id` | `/rapport/:id` | e-mail de fin d'audit (`privateReportUrl`), liens internes |
| R2 | `/rapport?id=:id&domaine=:d` | `/rapport/:id/domaines/:d` | ReportView |
| R3 | `/rapport?id=:id&check=:c` | `/rapport/:id/constats/:c` | ReportView |
| R4 | `/domaine?id=:id&domaine=:d` | `/rapport/:id/domaines/:d` | liens internes |
| R5 | `/domaine?id=:id` | `/rapport/:id/domaines` | liens internes |
| R6 | `/constat?id=:id&check=:c` | `/rapport/:id/constats/:c` | liens internes |
| R7 | `/constat?id=:id` | `/rapport/:id/constats` | liens internes |
| R8 | `/plan?id=:id` | `/rapport/:id/plan` | liens internes |
| R9 | `/brief?id=:id` | `/rapport/:id/brief` | liens internes |
| R10 | `/rapport/imprimer?id=:id` (ancienne page statique) | `/rapport/:id/imprimer` (déjà servie, inchangée) | export PDF |
| R11 | `/historique?site=:site` | `/sites/id/:site#historique` → `/sites/:host#historique` | liens internes |
| R12 | `/verifier?site=:site` | `/sites/id/:site#verification` → `/sites/:host#verification` | liens internes |
| R13 | `/badge?id=:id` | `/rapport/:id?partager=badge` (ouvre la feuille Partager) | liens internes |
| R4–R13 sans id | `/domaine`, `/constat`, `/plan`, `/brief`, `/badge` sans `id` | `/rapport/domaines`, `/rapport/constats`, `/rapport/plan`, `/rapport/brief`, `/rapport/badge` (page de l'onglet : invitation à choisir un rapport, ou mur de connexion) | anciens favoris |
| R14 | `/passer-pro` (et `?…`) | `/pro` (requête gardée) ; un compte Pro va sur `/compte` (#38). Renvoi côté page, pas en 301, pour garder cette règle. Les boutons Pro pointent déjà vers `/pro`. | boutons Pro |
| R15 | `/compte/alertes` | `/compte#alertes` | e-mails d'alerte et de récap (`mail.ts`, `mail-templates.ts`) |
| R16 | `/progression?site=…&url=…` | inchangée | e-mail d'échec (`relaunchAuditUrl`) |
| R17 | `/partage/:jeton`, `/score/:x`, `/verifier/:id` | inchangées (liens publics à jeton, déjà diffusés) | partage, badge |

Mise en œuvre :
- Une seule table, `apps/web/src/lib/redirects.ts`. Le build écrit les règles Netlify (`_redirects`), avec la correspondance de requête : `/rapport id=:id /rapport/:id 301`. Aucun déploiement ni lien Netlify.
- Onglets : une page statique par onglet (`pages/rapport/{domaines,constats,plan,brief,badge,imprimer}.astro`), servie sans changer l'adresse (règles 200 de la même table, `REWRITES`). `lib/report-route.ts` lit l'adresse (chemin, sinon ancienne requête) et produit toutes les adresses du rapport.
- Le serveur e2e local applique la même table (intergiciel de `astro.config.mjs`).
- Tests : un cas par ligne R1 à R17, en unitaire (table → adresse) et en e2e (statut 301 et `Location`). Les règles avec plusieurs paramètres passent avant les règles à un paramètre.
- Les e-mails et les liens internes produisent directement les nouvelles adresses. Les anciennes ne servent plus qu'aux liens déjà envoyés.

## 8. Décisions de l'owner (12/11/2026)

- **Page d'un site : `/sites/:host`.** Les anciens liens portent l'identifiant du site (`?site=`). Ils passent en 301 vers `/sites/id/:site`, une petite page qui lit le site, puis remplace l'adresse par `/sites/:host` (`location.replace`, ancre gardée). La base ne change pas.
- **Rapport : `/rapport/:id`.** `/rapport?id=` redirige vers `/rapport/:id`.
- **Page active de la barre : texte plus gras, sans soulignement.**
- Aucune migration de base sans le oui de l'owner.

## 9. Découpage

- **Lot 2 (PR accueil) :** la nav visiteur et la nav connecté, le bouton « Scanner mon site », le pied de page en 3 colonnes, et R14 (`/passer-pro` → `/pro`).
- **Lot 3 :** le rapport à onglets (`/rapport/:id`) et les redirections R1 à R10 et R13, avec la feuille Partager.
- **Lot 4 :** la page par site, le compte en sections, et les redirections R11, R12 et R15.
