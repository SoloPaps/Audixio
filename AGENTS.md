# AGENTS.md — Audixio

Lire ce fichier. Ensuite seulement la PART demandée dans `docs/dev/PLAN.md`, ou l’étape demandée dans `docs/etapes/`. Ne pas lire tout le dépôt.

Produit décidé : `docs/produit/FONCTIONNEMENT.md` (26 oct. 2026, **soft-gate PARTIEL + lock-components** 28 oct. 2026 soir). Canon : `SOFT-GATE-PARTIEL-CANON.md` + **SSOT** `MATRICE-STATUT-DROITS-CANON.md` + `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/` (historique).
Décisions owner soir : `docs/00-DECISIONS.md` + `docs/etapes/00-LISEZ-MOI.md`.

Design v6 : `docs/design/01-REGLES-STRICTES.md`, `docs/design/v6/INTEGRATION-v6.md`, `docs/design/v6/STRUCTURE.md`. État des lots : `docs/ETAT.md`.


---

## Mode caveman

- Réponses **ultra-courtes**. Pas de récap. Pas de préambule. Pas de reformulation de la demande.
- Montrer **seulement** le diff ou l’extrait utile. Jamais un fichier entier inchangé.
- **Une** question seulement si bloquant. Sinon appliquer le défaut de `docs/produit/QUESTIONS.md`.
- Avant les outils : une ligne listant les fichiers à ouvrir.
- Une PART / une étape = ce fichier + la section ciblée + les fichiers listés seulement. Max 8 fichiers. Pas d’exploration large du dépôt.
- Ne jamais lire `packages/engine/data/**`, `pnpm-lock.yaml`, `node_modules`, builds, sauf chemin exact donné par l’utilisateur.

---

## Produit

- **Double couche** : (1) particuliers — note(s), priorités, français simple ; (2) dévs / freelances / entreprises — détail domaines, Comment corriger, brief IA selon droits.
- Accueil → particulier d’abord + une ligne vers détail/brief. Rapport → verdict en haut, technique repliée.
- **Soft-gate PARTIEL** + **matrice** `MATRICE-STATUT-DROITS-CANON.md` : ouverts = Perf, SEO, Éco, Qualité ; A11y B1 (lettre A–F + « mesure automatique / partielle ») ; verrouillés = Sécurité, Vie privée, DNS (badge Verrouillé, pas lettre ; données absentes). **Un design COMPLET** + composants Verrouillé (pas hub Stitch PARTIEL séparé). Hub = note + TOP 10 titres + 8 cartes + Brief hors page. Note partielle : `partielle · N domaines · site non vérifié`. Serveur = capabilities. Sélection Rien/Vérif/Fix sync domaine↔brief. Canon : `SOFT-GATE-PARTIEL-CANON.md`.
- **Gratuit sans compte** : audit + soft-gate partiel ; 1 dernier audit navigateur ; **brief = aucun** (CTA compte) ; pas de création de lien.
- **Gratuit avec compte** (e-mail + mot de passe, Google ou GitHub) : plafonds **2 sites**, **1 lien** actif ; dernier rapport **par site** (profondeur 1) ; export PDF/MD de base. **Sans site vérifié** = soft-gate partiel + **brief PARTIEL**. **Compte + site vérifié** = vue complète + Comment corriger branché + **brief COMPLET** (Rien/Vérif/Fix, gratuit — pas réservé au Pro) ; tests actifs seulement si propriété revérifiée juste avant. Lien public = aucun brief + bandeau + noindex ; lien équipe = brief lecture seule même sans compte destinataire.
- **Pro (futur, après go-live)** : prix cible **~9 €/mois** ; historique long, multi-sites + graphes, Excel/CSV, export client soigné, alertes, rapports signés, **Pro = 10 sites**. Après le cœur (pas bloquant). Détail dans `docs/produit/FONCTIONNEMENT.md`. Le brief IA n’est **pas** réservé au Pro.
- UI en français d’abord. Toute chaîne visible passe par `t('clé')` (dictionnaire `fr`), jamais en dur. Pas d’emoji dans l’UI.

---

## Design (obligatoire)

- Avant toute UI : `docs/design/01-REGLES-STRICTES.md` (v6). Charte : `docs/design/DESIGN.md`. Jetons et composants : `docs/design/v6/INTEGRATION-v6.md`.
- Pages, adresses, redirections 301, barre et pied : `docs/design/v6/STRUCTURE.md`.
- Clair : jetons `[data-v6]` de `tokens.css`. Sombre : seulement `theme-dark.css` (`--d-*`). Police Geist / Geist Mono. Plus de palette v2, d’Inter ni de maquettes Stitch (archivées hors du dépôt le 12/11/2026).
- Une page passe en v6 lot par lot ; ses anciennes CSS de maquette partent avec elle.
- **Règles produit** : 2 sites / 1 lien, soft-gate PARTIEL, **matrice statut→droits**, lock-components, hub TOP 10, brief matrice, sélection sync, Comment corriger générique ouvert / branché site après vérif, Pro plus tard (~9 €, 10 sites), vie privée **tests partiels** HTTP/HTML (pas Tracker Radar / pas navigateur d'audit requis en bêta), A11y lettre A–F + « mesure automatique / partielle ». Source : `FONCTIONNEMENT.md` + `SOFT-GATE-PARTIEL-CANON.md` + `MATRICE-STATUT-DROITS-CANON.md`.
- Barre : `components/v6/SiteHeader.svelte`, entrées dans `apps/web/src/lib/nav-canon.ts` (voir `STRUCTURE.md`). Page active : texte plus gras, `aria-current="page"`.
- Logo uniquement : `docs/design/logos/`. INTERDIT : Material `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre A isolée ; SVG « ECG ».
- Thème : clair par défaut, suit `prefers-color-scheme`, choix manuel prioritaire. Pas de violet « IA », pas de `#000` plein écran.
- Corrections promesse (8 domaines, passif par défaut, horodaté, jargon, assistant IA) : `docs/produit/FONCTIONNEMENT.md` §10.
- Refonte UI ordonnée : `docs/etapes/`.

---

## Sécurité (non négociable)

- Site non vérifié = tests **passifs** seulement **et** rapport en **soft-gate partiel** même avec compte (ouverts détaillés ; sensibles absents ; brief PARTIEL si compte, aucun si anonyme). Tests actifs + domaines sensibles + Comment corriger branché + brief COMPLET = propriété vérifiée ; actifs **revérifiés juste avant** (art. 323-1 Code pénal).
- Formulation produit : « **passif par défaut** », jamais « 100 % passif ».
- Tout accès réseau sortant vers un site audité passe par `packages/net` (`safeFetch`, anti-SSRF). Jamais `fetch` direct.
- Aucun secret dans le code, les tests, les logs ou les commits. Noms de variables : `docs/dev/PLAN.md` §9.
- Détails de sécurité / vie privée / DNS : jamais publics par défaut (filtre serveur + RLS + soft-gate partiel ; pas de blur CSS sur donnée existante).
- Ne rien exploiter, ne rien forcer, ne rien soumettre : on observe.
- GitHub Actions **interdit** comme navigateur de service public.

---

## Qualité

- TypeScript strict. Tests obligatoires (Vitest ; Playwright + axe pour l’UI). Pas de PR sans tests verts.
- Tests hors ligne : fixtures locales et mocks réseau. Jamais d’appel aux vrais sites ni aux vraies API en CI.
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`. Une PR par PART ou par étape de refonte.

---

## Déploiement Netlify

- **INTERDIT** en dev : `netlify deploy`, liaison Git Netlify, deploy previews, branch deploys, build hooks.
- **Autorisé** : `netlify dev`, `netlify functions:invoke`, builds locaux, CI GitHub **sans** étape de déploiement.
- Seul le propriétaire fait l’unique déploiement final (**PART-27**). Checklist dans `docs/dev/PLAN.md`.

---

## Plugins / outils (réels du dépôt)

Ne pas inventer de plugins Cursor inexistants. Ce qui est en place :

| Outil | Rôle |
|---|---|
| **pnpm** 10 (`packageManager` racine) | Monorepo, filtres `@audigy/*` *(noms packages/lab historiques ; UI = **Audixio**)* |
| **Node** 22 (`engines`: `>=22 <23`) | Runtime |
| **Vitest** | Tests unitaires / intégration |
| **Playwright** | UI + runner navigateur (`@audigy/browser-runner`) |
| **Biome** | Lint / format (`pnpm lint`, `pnpm format`) |
| **Supabase CLI** | `supabase start` en local (Docker) |
| **Netlify CLI** | **dev only** (`netlify dev --offline`) — jamais deploy |
| **TypeScript** | `pnpm typecheck` |
| **Cursor rules** | `.cursor/rules/` : `00-core`, `design`, `security`, `stack` |

Scripts utiles : `pnpm i`, `pnpm check`, `pnpm test`, `pnpm build`. Audit bout-en-bout : `docs/dev/DEV-LOCAL.md` (lab `*.audigy.test` — historique technique ; marque UI = **Audixio**).

---

## Stockage (rappel agents)

- Données compte / sites / rapports / liens / alertes → **serveur Supabase** (local Docker en dev ; distant en prod).
- Pas sur le PC utilisateur sauf affichage et export ponctuel.
- Sans compte → au mieux dernier audit en mémoire navigateur.

---

## Vie privée + navigateur (rappel — 28 oct soir)

- **Bêta / local** : afficher **tout** ce qu’on peut trouver **sans** Tracker Radar DuckDuckGo et **sans** navigateur d’audit = tests partiels HTTP/HTML (Set-Cookie 1er load, scripts évidents, CMP OneTrust/Cookiebot/Didomi, liens politique cookies), libellés **« partiel / automatique »**.
- Domaine Vie privée = **Verrouillé** en soft-gate tant que non vérifié (inchangé).
- **Ensuite seulement** (owner) : serveur navigateur d’audit en **location VPS mensuelle** (~5–12 €/mois), pas un achat one-shot. Pas B (CLI) en voie principale publique.
- **Cœur Cursor d’abord** : capabilities serveur + filtrage, hub, soft-gate Verrouillé, connexion e-mail + mot de passe / Google / GitHub. Pro / chrome fancy / EN / VPS navigateur = après.
- **Ops** : maximum en local ; juriste / testeurs / go bêta publique = **owner seul**.
