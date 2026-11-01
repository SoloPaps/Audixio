# Réglages GitHub à cliquer à la main

Le dépôt ne peut pas activer ces cases tout seul. Réservé au propriétaire.

## Règles de la branche principale

Settings → Rules → Rulesets → ruleset `protection-main`.

Checks déjà exigés : `check` (workflow ci) et `analyze` (CodeQL). À ajouter :

- `Secrets (gitleaks)` — workflow security
- `Revue des dépendances` — workflow dependency-review
- `Workflows (zizmor)` — workflow zizmor

Cocher aussi **Require branches to be up to date before merging**.

## Sécurité du dépôt

Settings → Code security and analysis :

- Secret scanning : activé
- Push protection : activé
- Dependabot alerts : activé
- Dependabot security updates : activé
- Private vulnerability reporting : activé

## Fusions

Settings → General → Pull Requests :

- Allow auto-merge : activé
- Automatically delete head branches : activé

L'auto-merge Dependabot ne part que pour un **correctif** (toutes dépendances) ou une **mineure de dépendance directe de développement**. Le CI doit être vert. Les versions majeures, les mineures de production et les mineures indirectes restent à fusionner à la main. Les mineures de dev sont acceptées parce que les checks requis (`check`, CodeQL) bloquent la fusion si le build casse ; le périmètre est le code d'outillage, pas le produit livré.

## Correctifs automatiques du CI

Sur une PR (hors Dependabot, hors fork), knip et Biome peuvent pousser un commit. Le jeton par défaut **ne relance pas** les workflows : le job échoue alors exprès, avec le message de refaire un push (`git commit --allow-empty -m "ci: relance les checks" && git push`). Aucun secret n'est nécessaire.

Option plus tard, non branchée : une GitHub App limitée à ce dépôt, permission **Contents : Read and write**. Son jeton d'installation relance les workflows, contrairement à `GITHUB_TOKEN`. Ne pas mettre ce jeton dans le dépôt. Le workflow actuel ne lit aucun secret de ce genre.

## Agents cloud

`.cursor/environment.json` installe Node 22 (`.nvmrc`), pnpm via corepack, les dépendances, Chromium et la CLI Supabase ; `start` lance Docker puis Supabase local (hors de l'install, pour rester rapide au snapshot).
