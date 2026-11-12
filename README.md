# Audixio

Audit de sites web en **français clair** : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail.

- **Particuliers** : une note, trois priorités, langage simple.
- **Dévs / freelances / entreprises** : détail par domaine, Comment corriger, brief IA (Rien / Vérif / Fix).

Le fonctionnement complet (gratuit sans/avec compte, Pro futur, partage, plafonds, stockage) est dans [`docs/produit/FONCTIONNEMENT.md`](docs/produit/FONCTIONNEMENT.md).

## Statut

Développement local. Aucun site de production : le déploiement Netlify n’a pas été fait.

Au **26 octobre 2026** :

- PART-00 à PART-26 sont dans le dépôt. PART-26 (durcissement et recette, #36) mesure un build servi en local : [`docs/dev/RECETTE.md`](docs/dev/RECETTE.md).
- L’interface d’audit est en place (accueil, rapport, sites, historique). La refonte v6 avance lot par lot (`docs/ETAT.md`).
- Clarté de l’interface : Vagues 1, 2 et 3 sur `main` (#45, #46, #53). La suite (axe partiel, disponibilité, questionnaire, anglais) est sur `main` (#59).
- Le brief agent est dans l’interface : cases cochées, choix Rien / Vérif / Fix, pile reconnue.
- Pack design gelé : [`docs/design/`](docs/design/00-LISEZ-MOI.md) (PR #67).
- Refonte produit / UI ordonnée : [`docs/etapes/`](docs/etapes/00-LISEZ-MOI.md).

Le déploiement Netlify de production est une action manuelle, **une seule fois**, réservée au propriétaire, après PART-26 (**PART-27**). Checklist : [`docs/dev/PLAN.md`](docs/dev/PLAN.md). En développement, seul `netlify dev` est autorisé : pas de `netlify deploy`, pas de liaison Git, pas de deploy preview, pas de branch deploy.

## Design (v6)

- Règles : [`docs/design/01-REGLES-STRICTES.md`](docs/design/01-REGLES-STRICTES.md). Charte : [`docs/design/DESIGN.md`](docs/design/DESIGN.md).
- Jetons, composants, mouvement : [`docs/design/v6/INTEGRATION-v6.md`](docs/design/v6/INTEGRATION-v6.md).
- Pages, adresses et redirections : [`docs/design/v6/STRUCTURE.md`](docs/design/v6/STRUCTURE.md). État des lots : [`docs/ETAT.md`](docs/ETAT.md).
- Logo : [`docs/design/05-LOGO.md`](docs/design/05-LOGO.md).
- Les maquettes Stitch, la palette v2 et Arc Soft sont archivées hors du dépôt (12/11/2026).

## Démarrage local

Prérequis : **Node 22** (`nvm use`), **pnpm 10** (`corepack enable` ; le dépôt pin `pnpm@10.18.2`), **Docker** (Supabase local).

```bash
pnpm i
supabase start
pnpm check
```

Supabase reste **local** en développement. Les clés viennent de `supabase status` et ne vont pas dans git.

`pnpm check` enchaîne le garde-fou anti-déploiement, Biome, le copy-lint, le typecheck, Vitest, le build (`apps/web/dist`, `netlify/dist/functions`), l’auto-audit local, puis les tests d’interface et d’accessibilité.

Pour l’application et un audit de bout en bout (labo `*.audigy.test`, `netlify dev --offline --filter @audigy/web`, CLI), suivre [`docs/dev/DEV-LOCAL.md`](docs/dev/DEV-LOCAL.md). N’auditer que le labo, ou un site dont vous êtes propriétaire.

Chromium du runner, une fois : `pnpm --filter @audigy/browser-runner exec playwright install chromium`.

### Interdits en développement

- `netlify deploy`
- Liaison Git ↔ Netlify
- Deploy previews / branch deploys
- Auditer un site tiers sans propriété

Seul le propriétaire exécute **PART-27** (déploiement prod).

## Où sont stockées les données ?

| Contexte | Stockage |
|---|---|
| **Sans compte** | Au mieux le dernier audit en **mémoire navigateur** (1 site). Pas durable multi-appareils. |
| **Avec compte** | **Serveur** : comptes, sites suivis, rapports, historique, liens, alertes. |
| **Dev** | Supabase en **Docker local** (`supabase start`). |
| **Prod (prévu)** | Supabase **distant** + fonctions Netlify. |
| **PC utilisateur** | Affichage et **exports ponctuels** seulement (PDF/MD ; Excel/CSV en Pro plus tard). La source de vérité reste le serveur. |
| **Graphiques (Pro)** | Calculés depuis l’historique **serveur**. |

Détail produit : [`docs/produit/FONCTIONNEMENT.md`](docs/produit/FONCTIONNEMENT.md) §9.

## Stack (indicatif)

- Monorepo **pnpm**, **Node 22**, TypeScript strict
- **Astro** (`apps/web`), fonctions **Netlify**
- **Supabase** (auth e-mail + mot de passe, Google, GitHub ; données)
- `packages/net` anti-SSRF ; runner navigateur Playwright
- Qualité : Biome, Vitest, Playwright, axe

## Où lire

Carte complète : [`docs/LISEZ-MOI.md`](docs/LISEZ-MOI.md). Règles agents : [`AGENTS.md`](AGENTS.md) + `.cursor/rules/`.

| Document | Rôle |
|---|---|
| [`docs/produit/FONCTIONNEMENT.md`](docs/produit/FONCTIONNEMENT.md) | Produit : parcours, gratuit/Pro, partage, plafonds, stockage |
| [`docs/etapes/00-LISEZ-MOI.md`](docs/etapes/00-LISEZ-MOI.md) | Étapes ordonnées pour la modification complète du site |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | Charte v6 |
| [`docs/design/00-LISEZ-MOI.md`](docs/design/00-LISEZ-MOI.md) | Pack design gelé |
| [`docs/produit/METHODE.md`](docs/produit/METHODE.md) | Notation, version 2026.1 |
| [`docs/dev/PLAN.md`](docs/dev/PLAN.md) | Architecture, PART-00…26, PART-27 owner |
| [`docs/dev/DEV-LOCAL.md`](docs/dev/DEV-LOCAL.md) | Audit local bout-en-bout |
| [`docs/dev/RECETTE.md`](docs/dev/RECETTE.md) | Recette PART-26 (build local) |
| [`AGENTS.md`](AGENTS.md) | Règles agents (mode caveman, sécurité, outils) |
