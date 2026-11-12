# État du projet (mis à jour à chaque PR)

Dernière mise à jour : 12/11/2026, PR #206 « /methode v6 » (lot 2 bis).

## Lots de la refonte v6

| Lot | Contenu | État |
|---|---|---|
| 1. Fondations | jetons v6, composants, i18n, barre nav6, « Tarifs » | fusionné (#203, `f8572f8`) |
| Ménage | maquettes Stitch archivées, docs v6, tests regroupés, CI en parallèle, port e2e configurable | fusionné (#204) |
| 2. Accueil | accueil v6 en composants (`components/v6/accueil/`), barre visiteur et connecté, pied en 3 colonnes, boutons Pro vers `/pro` | fusionné (#205, `96f324b`) |
| 2 bis. Méthode | `/methode` v6, histoire v2 (`components/v6/methode/`, clés `me.*`, `lib/motion/methode-v6.ts`) | PR #206 |
| 3. Rapport | `/rapport/:id` à onglets, feuille « Partager », redirections R1–R10 et R13 | à faire |
| 4. Sites et compte | `/sites/:host`, compte en sections, redirections R11, R12 et R15 | à faire |
| 5. Légales et erreurs | gabarits v6 | à faire |

## Reprise rapide (si le travail est interrompu)

- Branches restantes : `main`, `design/v6-reference`, `cursor/maquette-accueil-1bc6` (PR #200 ouverte), `feat/methode-v6`.
- Local vert : lint, typecheck, vitest (136 fichiers), e2e UI hors tests qui demandent l'API invitée (`guest-audit`, `qa-momentic`, vérifiés en CI).
- PR #205 : correctifs CI (jauge lue par `page.request`, légende du scanner hors `<figcaption>` pour `qualite.html`, défilement bloqué sous la fenêtre visiteur v6, `toEnglish` attend le rechargement, e2e-reel sur « Scanner mon site, gratuit », Geist préchargée avec replis recalés : CLS 0,43 → 0,002 avec DejaVu Sans).
- `main` = `96f324b` (#205 accueil v6). `/methode` v6 en PR #206 (`feat/methode-v6`, worktree `/workspace/audixio-methode`). Outils de clés : `/workspace/port-methode` (`final.json` → `regen.py`).
- Étapes suivantes : squash de #206 ; puis `/methode`, pages publiques, espace connecté, légales et erreurs, robot.
- Après une coupure de la machine : `pnpm install --frozen-lockfile` puis `pnpm --filter @audigy/web exec playwright install chromium`.

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

## Gabarits

- Polices v6 : `styles/geist.css` précharge Geist (V6Page) ; les faces « Geist Repli » (Arial, Liberation Sans) et « Geist Repli DV » (DejaVu Sans) sont recalées par tranche de graisse pour que le remplacement ne décale rien. Changer de police = recalculer `size-adjust` et les `*-override`, contrôlé par `geist-cls.test.ts`.

- `layouts/V6Page.astro` : pages publiées en v6 (barre, contenu, pied de page en 3 colonnes). Une page y passe quand elle est refaite en v6.
- `layouts/Canon.astro` : pages pas encore refaites ; même barre, ancien pied de page.

## Tests e2e transverses

- `e2e/pages.spec.ts` : un test par page, qui vérifie :
  - le contraste en clair et en sombre ;
  - le fond sombre ;
  - l'anglais sans français ;
  - l'absence de débordement à 390 px.
- `e2e/liens.spec.ts` : aucun lien interne mort ni ancre absente.
- `e2e/accueil-v6.spec.ts` : clavier (onglets, FAQ), jeu, mouvement réduit, liens réels, dock, CLS, anglais.
- `e2e/methode-v6.spec.ts` : histoire épinglée, barème (E et F), calculette, FAQ, dock 1440/390, liens et ancres, CLS, anglais.
- `e2e/mobile-debordement.spec.ts` : largeurs de 320 à 414 px, parcours invité et connecté.

## CI

- Les jobs `statique`, `unitaires`, `publication` et `ui` (4 parts) tournent en parallèle.
- `check`, le check requis, les attend, applique les corrections automatiques et échoue si l'un d'eux échoue.
- `e2e` : parcours réels avec Netlify CLI.
