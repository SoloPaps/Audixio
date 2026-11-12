# État du projet (mis à jour à chaque PR)

Dernière mise à jour : 12/11/2026, PR « ménage ».

## Lots de la refonte v6

| Lot | Contenu | État |
|---|---|---|
| 1. Fondations | jetons v6, composants, i18n, barre nav6, « Tarifs » | fusionné (#203, `f8572f8`) |
| Ménage | maquettes Stitch archivées, docs v6, tests regroupés, CI en parallèle, port e2e configurable | cette PR |
| 2. Accueil | accueil v6, nouvelle barre visiteur et connecté, pied en 3 colonnes, `/passer-pro` → `/pro` | en cours (`feat/accueil-v6`) |
| 3. Rapport | `/rapport/:id` à onglets, feuille « Partager », redirections R1–R10 et R13 | à faire |
| 4. Sites et compte | `/sites/:host`, compte en sections, redirections R11, R12 et R15 | à faire |
| 5. Légales et erreurs | gabarits v6 | à faire |

## Règles

- Design : `docs/design/01-REGLES-STRICTES.md` (v6). Structure et redirections : `docs/design/v6/STRUCTURE.md`.
- Toute chaîne visible passe par `t('clé')`, en FR et en EN. Les couleurs sombres vivent seulement dans `theme-dark.css` (`--d-*`).
- On n'affaiblit jamais un test réel. Les tests métier (quotas, notes, droits et RLS, e-mails, sécurité, redirections) ne sont jamais retirés.
- Aucune migration de base sans le oui de l'owner. Aucun déploiement ni lien Netlify.
- Pas de force-push. Fusion en squash seulement quand la CI est verte sur la tête exacte.

## Commandes

```sh
pnpm install --frozen-lockfile
pnpm guard && pnpm lint && pnpm copy-lint && pnpm typecheck
pnpm test                       # unitaires (Supabase local pour certains)
pnpm build && pnpm self-audit && pnpm test:a11y
pnpm test:ui                    # e2e UI ; E2E_PORT=4322 pour changer de port (4321 par défaut)
pnpm --filter @audigy/web exec playwright test --shard=1/4   # une part des e2e
```

## Tests e2e transverses

- `e2e/pages.spec.ts` : un test par page, qui vérifie :
  - le contraste en clair et en sombre ;
  - le fond sombre ;
  - l'anglais sans français ;
  - l'absence de débordement à 390 px.
- `e2e/liens.spec.ts` : aucun lien interne mort ni ancre absente.
- `e2e/mobile-debordement.spec.ts` : largeurs de 320 à 414 px, parcours invité et connecté.

## CI

- Les jobs `statique`, `unitaires`, `publication` et `ui` (4 parts) tournent en parallèle.
- `check`, le check requis, les attend, applique les corrections automatiques et échoue si l'un d'eux échoue.
- `e2e` : parcours réels avec Netlify CLI.
