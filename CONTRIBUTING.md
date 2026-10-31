# Contribuer à Audixio

## Avant de commencer

- Lire `README.md` et `AGENTS.md`, puis la partie utile de `docs/`.
- Une faille de sécurité ne se signale **jamais** dans une issue publique : voir `SECURITY.md`.

## Flux de travail

1. `git switch main` puis `git pull`.
2. Créer une branche : `git switch -c type/sujet` (par exemple `fix/lien-casse`).
3. Modifier, puis commiter avec un message conventionnel : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
4. `git push -u origin ma-branche`, puis ouvrir une PR vers `main`.
5. Le CI corrige le format, lance les 9 vérifications et les analyses de sécurité. Merger seulement s'il est vert.

`main` est protégée : pas de push direct, CI et CodeQL obligatoires.

## En local

Prérequis : Node 22, pnpm 10, Docker (Supabase local). Voir `docs/dev/DEV-LOCAL.md`.

```bash
pnpm i
pnpm check
```

## Règles

- Aucun secret dans le code, les tests ou les commits. Les vraies clés restent dans `.env` (ignoré par Git) ou dans les secrets GitHub.
- Tests hors ligne : fixtures locales, jamais de vrais sites ni de vraies API en CI.
- Toute chaîne visible passe par `t('clé')`.
