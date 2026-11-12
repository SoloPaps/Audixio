# État du projet (mis à jour à chaque PR)

Dernière mise à jour : 12/11/2026, PR « CSP des adresses réécrites ».

## Lots de la refonte v6

| Lot | Contenu | État |
|---|---|---|
| 1. Fondations | jetons v6, composants, i18n, barre nav6, « Tarifs » | fusionné (#203, `f8572f8`) |
| Ménage | maquettes Stitch archivées, docs v6, tests regroupés, CI en parallèle, port e2e configurable | fusionné (#204) |
| 2. Accueil | accueil v6 en composants (`components/v6/accueil/`), barre visiteur et connecté, pied en 3 colonnes, boutons Pro vers `/pro` | fusionné (#205, `96f324b`) |
| 2 bis. Méthode | `/methode` v6, histoire v2 (`components/v6/methode/`, clés `me.*`, `lib/motion/methode-v6.ts`) | fusionné (#206, `72fb162`) |
| 3a. Exemple de rapport | `/exemple-rapport` sur V6Page, feuille portée sous `.ex` (`exemple-v6.css`), couleurs sur les jetons v6, Geist | fusionné (#207, `7354922`) |
| 3b. Tarifs | `/pro` sur V6Page (`pro-v6.css`, `.pr6`), panneau toujours sombre `.v6-nuit` (palette nuit fixe dans `pro-v6.css` ; `theme-dark.css` reste réservé au thème sombre), `/passer-pro` réduite à son renvoi vers `/pro` (requête et ancre gardées) | fusionné (#208, `f156f6c`) |
| 4a. Transparence | `/robot`, `/ecoconception`, `/accessibilite` sur V6Page (`.rb`, `.eco`, `.acc`), texte `--cta-fg` sur `--cta`, bandeau final en panneau `.v6-nuit` (palette dans la feuille de page) | fusionné (#209, `924602e`) |
| Barre v6 | focus dans la barre collante sans saut (liens hors `scroll-padding-top`), position rendue à la fermeture du menu ; test `nav6-focus.spec` | fusionné (#210, `27dad43`) |
| 4b. Demande d’accès, vérifier | `/demande-acces`, `/verifier`, `/verifier/[id]` sur V6Page (`.dem`, `.pv`, `.vf`), barre de /verifier en `.vdock`, liens de texte et encart hors session au dessin v6 (`chrome.css`, sélecteurs `[data-v6]`) ; test commun `pages-v6.spec` | fusionné (#211, `2589f36`) |
| 3. Rapport (structure) | `/rapport/:id` à onglets (`ReportTabs`, une page statique par onglet sous `pages/rapport/`), index des domaines et des constats (`ReportIndex`), feuille « Partager » à trois choix (lien public, badge, PDF ; `?partager=badge` l'ouvre sur le badge), table unique `lib/redirects.ts` (R1–R10, R13, anciennes pages sans id) écrite en `dist/_redirects` et appliquée par le serveur de dev, adresses produites par `lib/report-route.ts`, e-mail de fin d'audit sur `/rapport/:id` ; test `rapport-onglets.spec` | fusionné (#212, `b8af821`) |
| 3c. Rapport (dessin v6) | pages du rapport sur V6Page (`hub`, `domaine`, `constat`, `plan`, `brief`, `badge`, `pdf`) | à faire |
| 4. Sites et compte | `/sites/:host`, compte en sections, redirections R11, R12 et R15 | à faire |
| 5. Légales et erreurs | gabarits v6 | à faire |

## Reprise rapide (si le travail est interrompu)

- Branches restantes : `main`, `design/v6-reference` (#200 fermée, branches fusionnées supprimées ; chaque branche est supprimée juste après son squash).
- Local vert : lint, typecheck, vitest (136 fichiers), e2e UI hors tests qui demandent l'API invitée (`guest-audit`, `qa-momentic`, vérifiés en CI).
- PR #205 : correctifs CI (jauge lue par `page.request`, légende du scanner hors `<figcaption>` pour `qualite.html`, défilement bloqué sous la fenêtre visiteur v6, `toEnglish` attend le rechargement, e2e-reel sur « Scanner mon site, gratuit », Geist préchargée avec replis recalés : CLS 0,43 → 0,002 avec DejaVu Sans).
- `main` = `b8af821` (#212 lot 3), après `2589f36` (#211 lot 4b), `27dad43` (#210 barre v6), `924602e` (#209), `f156f6c` (#208), `7354922` (#207), `72fb162` (#206) et `96f324b` (#205). Worktree de travail : `/workspace/audixio-methode` (branche de la page en cours). Outils de clés : `/workspace/port-methode` (`final.json` → `regen.py`).
- Outil de portage d’une feuille v2 vers v6 : `/workspace/port-exemple/scope.py` (portée sous une classe, `--d-*` → jetons v6, noms locaux préfixés `--x-`, animations préfixées, sélecteurs `html[data-vue]` et `:where(...)` repris) ; `port_page.py` (Canon → V6Page), `fix_inline.py` (variables en ligne), `port_mobile.py` (règles `html[data-vue]` de `mobile-fit.css`, que V6Page ne pose plus), `ctafg.py` (texte blanc sur `--cta` → `--cta-fg`).
- Étapes suivantes : dessin v6 des pages du rapport (3c) ; puis `/sites/:host`, `/compte` en sections, R11, R12, R15 ; puis légales et erreurs.
- CSP des adresses réécrites : `scripts/publish-policy.ts` donne une seule CSP par famille (`/rapport`, `/partage`, `/score`, `/verifier`), union des empreintes de ses pages, sous `/famille` et `/famille/*` ; une adresse réécrite reçoit donc la politique de la page servie (test « CSP des adresses réécrites »).
- Tranches téléphone (390 px FR clair, 780 × 1200) : `/workspace/port-accueil/tools/tel.mjs` puis `tel.py`, dans `/workspace/boards/tel/`.
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
- `e2e/exemple-v6.spec.ts` : gabarit v6, jetons v6 clair et sombre, 390 px, liens et ancres.
- `e2e/methode-v6.spec.ts` : histoire épinglée, barème (E et F), calculette, FAQ, dock 1440/390, liens et ancres, CLS, anglais.
- `e2e/mobile-debordement.spec.ts` : largeurs de 320 à 414 px, parcours invité et connecté.

## CI

- Les jobs `statique`, `unitaires`, `publication` et `ui` (4 parts) tournent en parallèle.
- `check`, le check requis, les attend, applique les corrections automatiques et échoue si l'un d'eux échoue.
- `e2e` : parcours réels avec Netlify CLI.
