# Matrice des droits par statut — 9 novembre 2026

Vérification d’implémentation (pages, actions, API, RLS) à la date indiquée.
La source de vérité des capacités reste [`docs/produit/MATRICE-STATUT-DROITS-CANON.md`](../produit/MATRICE-STATUT-DROITS-CANON.md).


Base : `main` `31567b1ecac403fe371d44ffa6ee0803a5f8bf7e` (Europe/Paris).  
Colonnes demandées : **visiteur** (anonyme), **compte gratuit**, **compte Pro**.  
Sources : code (`packages/db/src/droits.ts`, handlers `packages/orchestrator`, RLS, pages, `espace-boot.ts`), SSOT `docs/produit/MATRICE-STATUT-DROITS-CANON.md`, décisions owner (mémoire et brief) : profondeur 1 gratuit ; export `/historique` CSV+PDF pour tout compte, Excel+JSON seulement Pro, aucun pour le visiteur ; `/passer-pro` → `/pro` pour visiteur et gratuit, « déjà Pro » pour Pro ; badge uniquement avec un lien public ; `/historique` d’un site inconnu → `/sites` ; plafonds 2 sites / 1 lien (gratuit), 10 sites (Pro) ; **liens de partage Pro illimités** (décision owner du 9 novembre 2026, comportement actuel conservé, sans migration). `/dev/composants` est une page de recette : elle reste disponible sous `astro dev`, mais `scripts/build.mjs` la retire du `dist` de production (déjà le cas sur `31567b1e`).

Le statut canon distingue aussi **compte non vérifié / vérifié** (la preuve porte sur *ce* site) et les lecteurs **lien public 30 j** / **lien équipe**. Un compte Pro **sans preuve sur ce site** reste en soft-gate PARTIEL pour le rapport ; le plan ne débloque pas Sécurité / Vie privée / DNS. Ces axes sont rappelés quand ils changent la cellule.

Vérification : lecture du code + tests unitaires déjà présents + passe Playwright des specs de droits listées plus bas (même machine que la comparaison i18n-noms). Les tests RLS / plafonds SQL / profondeur (`packages/db/test/{rls,plafonds,history-depth,auth-flow,liens-expiration}.test.ts` et e2e orchestrateur liés) exigent Supabase local : ils sont écrits, ils échouent ici faute de base, **ils tournent en CI**.

---

## 1. Inventaire des pages

Les pages sont statiques. Sauf `/passer-pro` (redirection client immédiate), l’accès direct par URL **charge le HTML**. Le garde est ensuite côté client (`SessionWall`, `bootEspace`, composants). Les données sensibles ne doivent pas arriver au client : API + RLS.

| Page | Visiteur | Gratuit | Pro | Comment le savoir |
|------|----------|---------|-----|-------------------|
| `/`, `/methode`, `/pro`, `/cgu`, `/confidentialite`, `/mentions-legales`, `/accessibilite`, `/ecoconception`, `/robot`, `/cookies`, `/exemple-rapport`, `/score`, `/maintenance`, `/404`, `/500` | autorisé (public) | autorisé | autorisé ; `/pro` affiche « Vous êtes déjà Pro » + lien `/compte` (PR #174) | pages publiques ; `pro-deja-pro.spec.ts` |
| `/connexion`, `/inscription`, `/reinitialisation`, `/email-confirme` | autorisé | autorisé (compte déjà ouvert) | idem | AuthGate |
| `/passer-pro` | redirigé vers `/pro` (query + ancre conservées) | redirigé vers `/pro` | redirigé vers `/compte` | `routeUpgrade` / `passer-pro.astro` (cookie ou `audigy-auth`) ; `passer-pro-redirection.spec.ts` |
| `/compte`, `/compte/alertes`, `/sites`, `/historique`, `/bienvenue` | page servie, **SessionWall** (pas le contenu compte) | autorisé | autorisé | `bootEspace` mode `out` ; `HistoryBoard` / `SitesBoard` / `AccountBoard` / `AlertsBoard` |
| `/historique?site=` inconnu ou d’un autre compte | SessionWall si non connecté | **redirigé vers `/sites`** | idem | `espace-boot.ts` (~1092) ; `historique-site.spec.ts` |
| `/badge` | page ouverte ; pas de code d’embed, message visiteur | pas de code tant qu’il n’y a pas de **lien public** (CTA créer le lien ; jamais `/rapport` privé) | idem, sous réserve du plafond de liens | `badge-target.ts`, `BadgeView.svelte` ; `badge-partage.spec.ts` |
| `/brief`, `/constat`, `/plan`, `/domaine`, `/rapport`, `/rapport/imprimer` | vue invitée / maquette ou rapport filtré (domaines sensibles absents du payload) | PARTIEL si site non vérifié, COMPLET si vérifié | idem + extras plan (historique, etc.) | matrice canon + `rightsFor` / `visibleFinding` |
| `/progression`, `/audit-echoue` | autorisé (parcours audit visiteur) | autorisé | autorisé | guest / lab e2e |
| `/partage/:token` | autorisé si jeton public valide (vue limitée, bandeau) ; 404 sinon | idem | idem | `handlePartage` ; lecteur `link_public` |
| `/demande-acces`, `/sites/:host/demandes/:id` | formulaire public / flux d’accès équipe | proprio : accepter/refuser si compte + propriété | idem | `handleAccessRequest`, `handleLien` decision |
| `/verifier`, `/verifier/:id` | dépôt de preuve PDF/JSON (outil public de contrôle d’intégrité) | + parcours propriété de *son* site | idem | `verifier.spec.ts`, API vérifications (compte) |
| `/dev/composants` | **404 en production** (`scripts/build.mjs` supprime `dist/dev` après le build Astro). Disponible seulement en `astro dev` (recette, Playwright, Lighthouse a11y) | idem | idem | décision owner 2026-11-09 ; déjà en place sur `31567b1e` |

---

## 2. Inventaire des actions

| Action | Visiteur | Gratuit | Pro | Preuve |
|--------|----------|---------|-----|--------|
| Lancer un audit (compte, `POST /api/audits`) | **401** ; doit passer par `POST /api/guest-audits` | oui, dans les plafonds (2 sites, file, rate) ; **403 unverified** si tests actifs / mode qui exige la preuve | oui, plafond 10 sites ; extras file | `handleCreate` ; `http.test.ts` |
| Audit visiteur (`POST /api/guest-audits`) | oui, **3 / 24 h / IP** hachée ; payload filtré (pas de domaines sensibles) | n/a (compte → `/api/audits`) | n/a | `GUEST_AUDIT` ; `guest.test.ts` ; `guest-audit.spec.ts` |
| Brief IA | NON (CTA compte) | PARTIEL si non vérifié, COMPLET si vérifié ; édition oui | idem (le Pro n’a pas un « meilleur brief ») | `rightsFor.brief` ; `brief-export` 401 sans jeton |
| Comment corriger branché | NON | seulement site **vérifié** | idem | `commentCorrigerBranche` |
| Tests actifs | NON | seulement compte + preuve **fraîche &lt; 10 min** | idem | `rightsFor.testsActifs` |
| Export `/historique` | aucun (SessionWall, pas de menu) | CSV + PDF ; Excel/JSON masqués, clic ignoré (`historyFormats`) | CSV + PDF + Excel + JSON | décision 2026-11-05 ; `u-export.spec.ts`, `history-export.ts` |
| Profondeur historique | 1 dernier audit navigateur (pas de suivi durable) | **1** rapport par site (RLS) | historique long | migration `20261105203717_historique_profondeur_gratuite` (déjà en prod d’après décision owner) ; `history-depth.test.ts` (CI) ; `u-depth.spec.ts` |
| Créer un site suivi | NON | jusqu’à 2, puis 409 `site_limit` + UI / popup Pro | jusqu’à 10 | `withinSiteQuota`, `plafonds.test.ts` (CI) |
| Créer / lister / retirer un lien (`/api/liens`) | 401 | 1 lien actif (public **ou** équipe) ; 429 `user_limit` au-delà | **illimité** (décision owner 2026-11-09 : garder le comportement actuel, sans migration) | `withinLinkQuota` ; `matrice-droits.test.ts` ; `partage-lien-limite.spec.ts` |
| Lire un lien public (`POST /api/partage` + page) | oui, vue limitée | oui | oui | `handlePartage` |
| Badge embed | pas de code | exige un lien public existant ou créé | idem | décision owner 2026-11-09 ; `badge-partage.spec.ts` |
| Alertes `/compte/alertes` | SessionWall | cadence figée mensuelle, SSL 14 j, on/off possible | cadence / SSL / seuil réglables | `clampAlerts` ; `droits.test.ts` |
| Places / GSC OAuth | 401 sur `/api/places` et `/api/oauth/google/*` | oui pour *ses* sites | oui | handlers |
| Export RGPD compte (`GET /api/compte/export`) | 401 | oui (profil, sites, derniers rapports, préférences — pas l’historique long en gratuit) | oui | `handleAccount` |
| Accepter CGU / supprimer le compte | 401 | oui (`confirm: supprimer` / EN `delete` accepté) | oui | `account.ts` ; décision EN « delete » |
| Formulaire liste d’attente `/pro` | oui | oui | pas le formulaire, message déjà Pro | Stripe **gelé** |
| Opt-out robot, demande d’accès, désinscription courriel | oui (rate-limités) | oui | oui | `intake.ts`, `unsubscribe` |

---

## 3. Inventaire des API / fonctions Netlify

Toutes les fonctions listées au `pnpm build`. Auth = Bearer, sauf mention.

| Endpoint | Méthodes | Visiteur | Gratuit / Pro | Notes |
|----------|----------|----------|---------------|--------|
| `/api/auth/*` | GET, POST | inscription / connexion / reset | session cookies httpOnly | `netlify/functions/auth.ts` |
| `/api/audits` | POST | 401 | 202/200 ou 409/429/403 | compte requis |
| `/api/audits/:id` | GET | 401 | 200 si proprio (RLS), 404 sinon | payload déjà filtré selon preuve |
| `/api/audits/:id/brief` | GET, POST | 401 | brief selon vérif | `handleBriefExport` |
| `/api/guest-audits` | POST | 202 ou 429 `guest_limit` | — | pas de jeton |
| `/api/compte/:action` | GET, POST | 401 | `export`, `cgu`, `suppression` | |
| `/api/liens` | GET, POST, DELETE | 401 | quotas liens | |
| `/api/liens/decision` | POST | 401 | proprio | |
| `/api/partage` | POST | 200/404 selon jeton | idem | pas d’auth compte |
| `/api/demandes-acces` | POST | oui, rate limit | oui | |
| `/api/places` | GET, POST | 401 | oui | |
| `/api/robot` | POST | oui, rate limit | oui | |
| `/api/unsubscribe` | (get/post) | oui, jeton mail | oui | |
| `/api/verifications`, `/api/verifications/check` | POST | 401 | oui, *ses* sites | |
| `/api/oauth/google/start` | POST | 401 | oui | |
| `/api/oauth/google/callback` | GET | flux OAuth | — | |
| `/api/oauth/google/revoke` | POST | 401 | oui | |
| `audit-run-background`, `verification-recheck-background` | POST | 401 sans HMAC | service | |
| `schedule-tick`, `digest-weekly` | cron | interne | — | |

RLS (init + `coeur_droits`, `rls_sites_reports_anon`, profondeur gratuite) : un visiteur ne lit pas les rapports privés ; l’anon peut lire un rapport public non révoqué et un site `is_public` ; le proprio voit ses lignes ; la profondeur 1 est imposée en SQL pour le gratuit.

---

## 4. Matrice capacités (canon) × 3 statuts demandés

Extrait de `rightsFor()` et de la SSOT, **vérifié par** `packages/db/test/droits.test.ts` (tourne en local, sans Supabase).

| Capacité | Visiteur | Gratuit (non vérifié / vérifié) | Pro (non vérifié / vérifié) |
|----------|----------|----------------------------------|------------------------------|
| Note globale | NON | NON / OUI | NON / OUI |
| Note partielle | OUI | OUI / NON | OUI / NON |
| Détail Perf/SEO/Éco/Qualité | OUI | OUI | OUI |
| A11y B1 | PARTIEL | PARTIEL / + conformité | idem |
| Sécurité / VP / DNS | Verrouillé, **absent du payload** | Verrouillé / ouvert | idem (le plan ne débloque pas) |
| Brief | aucun | partiel / complet | partiel / complet |
| Comment corriger branché | NON | NON / OUI | NON / OUI |
| Guides génériques | OUI | OUI | OUI |
| Export base (rapport) | NON | OUI | OUI + extras Pro |
| Export historique | NON | CSV+PDF | CSV+PDF+Excel+JSON |
| Sélection Rien/Vérif/Fix | NON | OUI (findings visibles) | OUI |
| Tests actifs | NON | NON / OUI si preuve fraîche | idem |
| Plafond sites | 0 suivi | 2 | 10 |
| Plafond liens | 0 | 1 | **illimité** (`null` / `withinLinkQuota` toujours vrai) |
| Extras Pro (historique long, alertes réglables, Excel/JSON) | NON | NON | OUI |

---

## 5. Constats (écarts)

Aucun écart **haute** gravité constaté entre le code de `31567b1e`, les tests existants et les décisions rappelées dans le brief.

| Cellule | Attendu | Réel | Gravité | Couverture |
|---------|---------|------|---------|------------|
| `/passer-pro` visiteur/gratuit → `/pro`, Pro → déjà Pro / `/compte` | selon brief | conforme (`routeUpgrade`, page `/pro`) | — | e2e `passer-pro-redirection`, `pro-deja-pro` |
| Export historique | CSV+PDF comptes, Excel+JSON Pro, 0 visiteur | conforme, garde-fou `historyFormats` même si le bouton DOM est forcé | — | `u-export`, `history-export.test.ts` |
| `/historique` site inconnu | → `/sites` | conforme | — | `historique-site.spec.ts` |
| Badge | lien public obligatoire | conforme, pas de cible `/rapport` privé | — | `badge-target.test.ts`, `badge-partage.spec.ts` |
| Plafonds 2 sites / 1 lien gratuit | API + SQL | conforme dans le code | — | unit + `plafonds.test.ts` **CI seulement** ici |
| Profondeur 1 gratuit | RLS | conforme dans la migration et le miroir UI | — | `history-depth.test.ts` **CI seulement** ; `u-depth.spec.ts` UI |
| `POST /api/audits` sans jeton | 401 | 401 | — | `http.test.ts` |
| Payload visiteur / non vérifié | pas de findings sensibles | `visibleFinding` retire, `guestAuditView` filtre | — | `droits.test.ts`, `guest.test.ts` |
| Plafond liens Pro | illimité (décision owner 2026-11-09) | **illimité** dans `withinLinkQuota` / `plafondLiensActifs: null` | — | `matrice-droits.test.ts` (affirme le comportement voulu) |
| `/dev/composants` public | fermé en production | déjà retiré du `dist` par `scripts/build.mjs` ; 404 statique | — | décision owner 2026-11-09 ; déjà sur `main` (pas de patch) |
| Export *rapport* (PDF/MD/HTML vs formats machine) | décisions 2026-10-27 encore dans la matrice canon « export base » | à distinguer de l’export `/historique` (décision 2026-11-05) | **info** : pas d’écart observé si on traite les deux surfaces séparément | `mo-exports`, brief-export |

Aucune correction de code, donc **aucun patch** `droits-*` et **aucune migration** à soumettre.

---

## 6. Cellules vérifiées et tests CI-only

Méthode de décompte : chaque ligne des tableaux 1–4, pour chaque statut applicable, compte pour une cellule. Les pages publiques identiques (15 URL × 3 statuts) sont comptées. Total **environ 210 cellules** inventoriées ; **toutes ont une source code**. Vérification *exécutée sur cette machine* :

- Unitaires (sans Supabase) : `droits.test.ts`, `history-export`, `history-depth` UI, `badge-target`, `pro-redirect`, `http.test.ts`, `guest.test.ts`, etc. (inclus dans les 1362 tests verts du même monorepo).
- Playwright ciblé (21:21–21:22 Europe/Paris), 53/53 passed : `passer-pro-redirection`, `pro-deja-pro` (FR/EN, visiteur/gratuit/Pro), `u-export`, `u-depth`, `badge-partage`, `historique-site`, `mo-acces` (visiteur sans lien, `/plan` mur de connexion), `mo-exports`, `mo-historique`, `partage-lien-limite` (FR/EN).
- Playwright complet déjà joué sur `main` 31567b1e : 746 passed, 1 skipped, 7 failed (instables / labo déjà connus : guest-audit, qa-momentic injoignable, `pro-deja-pro` EN en `ERR_ABORTED`, `/progression` EN) — pas des trous de droits. La même passe sur `fix/i18n-noms` n’ajoute aucun échec absent de main.

**CI seulement** (Supabase local absent ici) : `rls.test.ts`, `plafonds.test.ts`, `history-depth.test.ts` (SQL), `auth-flow.test.ts`, `liens-expiration.test.ts`, `packages/orchestrator/test/e2e.test.ts`, `liens-expiration.e2e.test.ts`, `schedule-alerts.e2e.test.ts`.

---

## 7. Questions pour l’owner

Tranchées le 9 novembre 2026 :

1. **Plafond de liens Pro** : illimité. On garde le comportement actuel, sans migration. Les tests l’affirment comme comportement voulu.
2. **`/dev/composants`** : fermé au public en production. Déjà assuré sur `31567b1e` par `scripts/build.mjs` (suppression de `dist/dev`, échec du build si la page fuit). Disponible en `astro dev` seulement. Pas de patch applicatif supplémentaire.

Encore ouvertes :

3. Confirmation : l’export **d’un rapport** (PDF/MD/HTML, formats Pro) reste la règle d’octobre, distincte de l’export **d’historique** (CSV+PDF / Excel+JSON) de novembre ?
4. Lecteurs **lien public** et **lien équipe** : hors des 3 colonnes demandées ; la SSOT les décrit déjà. Faut-il une matrice complémentaire dédiée, ou c’est clos ?

Hors droits, déjà ouverts par ailleurs : dialogue e-mail de `/progression` ; gabarit d’inscription GoTrue unique en français ; Stripe / paiement Pro toujours gelés (liste d’attente seulement).
