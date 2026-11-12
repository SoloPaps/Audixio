# État du projet (mis à jour à chaque PR)

Dernière mise à jour : 12/11/2026, PR « lot 6b, robot de fin de lot ».

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
| CSP des adresses réécrites | une CSP par famille (`/rapport`, `/partage`, `/score`, `/verifier`) pour `/rapport/:id/*`, l’impression et `/partage/:jeton` ; test « CSP des adresses réécrites » | fusionné (#213, `e4d92b1`) |
| 3c. Rapport (dessin v6) | pages du rapport sur V6Page, feuilles portées sous classe (`.r6-hub`, `.r6-dom`/`.r6-res`, `.r6-con`, `.r6-plan`, `.r6-brief`, `.r6-badge`, `.r6-pdf`, fichiers `*-v6.css`), onglets et feuille Partager sur les jetons v6, narration « Comment lire ce rapport » (trois étapes, trait tracé à l’apparition, immobile en mouvement réduit), Geist en graisses fixes pour un PDF à texte réel (`geist-imprimer.css`) ; `hub.css` reste pour `/score` et `/partage` | fusionné (#214, `f984966`) |
| 4. Sites et compte | `/sites/:host` (`pages/sites/fiche.astro`, `SitePage.svelte`, `site-v6.css`) en quatre sections `#audits`, `#historique` (HistoryBoard intégré, `historique-v6.css` sous `.hs`), `#verification` (VerificationPanel intégré sous `.pv`), `#partage` (SiteShare) ; résolveur `/sites/id/:site` (`SiteResolver.svelte`, `location.replace` vers `/sites/:host`, ancre gardée, aucun site d’un autre compte) ; adresses dans `lib/site-route.ts` ; `/compte` sur V6Page en sections `#profil`, `#alertes` (AlertsBoard intégré, `alertes-v6.css` sous `.al`), `#abonnement`, feuille `compte-v6.css` en `@scope (.co) to (.al)` ; R11, R12, R15 dans `lib/redirects.ts` (requête gardée avant l’ancre), `/compte/alertes` retirée ; garde de session sur `/sites/:host` et `/sites/id/:site` (`auth-policy.ts`, `netlify.toml`) ; e-mails d’alerte vers `/compte#alertes` | fusionné (#215, `905c523`) |
| 5. Pages restantes | plus aucune page sur Canon. Connectées : `/sites` (`sites-liste-v6.css`, `sites-vide-v6.css` sous `.msl`, l’état liste ou vide reste porté par `html[data-board]`), `/historique` (`.hs`), `/bienvenue` (`.bv`), `/progression` (`.prg`), `/audit-echoue` (`.aec`), `/sites/:host/demandes/:id` (`.dmd`), `/score/*` et `/partage/*` (`score-public-v6.css` sous `.sp`, `public-hub-v6.css` sous `.sp .public-hub`, `hub.css` retirée). Accès : `/connexion`, `/inscription` (`AuthGate` passe par V6Page, carte centrée `.au .auth-gate`), `/email-confirme`, `/reinitialisation` (`auth-v6.css` sous `.au`). Légales : `/cgu` (`.lgc`), `/confidentialite` (`.lgp`), `/mentions-legales` (`.lgm`), `/cookies` (`.cks`, boîte de dialogue sur voile, page immobile, pied hors champ). Erreurs : `/404` (`.er4`), `/500` (`.er5`), `/maintenance` (`.mnt`) | fusionné (#216, `0fd3227`) |
| 6. En-tête v6 et nettoyage | `components/v6/SiteHeader.svelte` devient le vrai composant d’en-tête (logique de l’ancienne CanonBar, ancre `#axn`, verrou sur `<html>`) ; `Canon.astro`, `CanonBar.svelte`, `CanonFooter.astro`, `mobile-fit.css` et `maquettes/liens.css` supprimés ; règles générales de `v6.css` portées pour ne plus écraser les pages ; petits défauts de `/bienvenue`, `/historique` et `/audit-echoue` ; robot de liens et de boutons commencé | fusionné (#217, `db5c92f`) |
| 6b. Robot de fin de lot | `e2e/robot-final.spec.ts` et `e2e/robot/robot-lib.ts` : chaque lien rendu mène à une vraie page (redirections suivies, ancres cherchées dans le HTML servi puis dans le navigateur après le script), chaque bouton visible a un effet (navigation, requête, DOM, défilement, focus, presse-papiers, impression, sélecteur de fichier…). CI : liens en FR clair 1440 et EN sombre 390, boutons en FR clair 1440 ; `ROBOT_FULL=1` : huit modes pour les liens, boutons à 390 et 1440. Liste des pages et parcours pour Mo (Momentic) : `docs/dev/mo-pages.md`, Mo non lancé | fusionné (#218, `049c8ff`) |
| 6c. Cookies au téléphone, essai d’Assrt | Boîte cookies ouverte : la zone défilante s’arrête sous la barre de menu (`max-height: calc(100% - var(--scroll-pad))`), test `e2e/cookies-sous-barre.spec.ts` à 390×844 et 390×664. Assrt non lancé : la CLI publiée (`@m13v/assrt` 0.3.3 et 0.4.0-beta.1) n’a pas de commande `discover`, exige macOS avec Claude Code ou une clé `ANTHROPIC_API_KEY` (service payant), et son `postinstall` écrit `CLAUDE.md` et `.claude/hooks` dans le dossier courant : ne jamais l’installer dans le dépôt | en cours |

## Reprise rapide (si le travail est interrompu)

- Branches restantes : `main`, `design/v6-reference` (#200 fermée, branches fusionnées supprimées ; chaque branche est supprimée juste après son squash).
- Local vert : lint, typecheck, vitest (140 fichiers), e2e UI hors tests qui demandent l'API invitée (`guest-audit`, `qa-momentic`, vérifiés en CI).
- PR #205 : correctifs CI (jauge lue par `page.request`, légende du scanner hors `<figcaption>` pour `qualite.html`, défilement bloqué sous la fenêtre visiteur v6, `toEnglish` attend le rechargement, e2e-reel sur « Scanner mon site, gratuit », Geist préchargée avec replis recalés : CLS 0,43 → 0,002 avec DejaVu Sans).
- `main` = `049c8ff` (#218 lot 6b), après `db5c92f` (#217 lot 6), `0fd3227` (#216 lot 5), `905c523` (#215 lot 4), `f984966` (#214 lot 3c), `e4d92b1` (#213 CSP), `b8af821` (#212 lot 3), `2589f36` (#211 lot 4b), `27dad43` (#210 barre v6), `924602e` (#209), `f156f6c` (#208), `7354922` (#207), `72fb162` (#206) et `96f324b` (#205). Worktree de travail : `/workspace/audixio-methode` (branche de la page en cours). Outils de clés : `/workspace/port-methode` (`final.json` → `regen.py`).
- Outil de portage d’une feuille v2 vers v6 : `/workspace/port-exemple/scope.py` (portée sous une classe, `--d-*` → jetons v6, noms locaux préfixés `--x-`, animations préfixées, sélecteurs `html[data-vue]` et `:where(...)` repris) ; `port_page.py` (Canon → V6Page), `port_any.py` (Canon → V6Page, contenu enveloppé dans `<div class="portée">` quand la page a des décors hors de `<main>` ; `WRAP=1` pour le forcer), `fix_inline.py` (variables en ligne), `port_mobile.py` (règles `html[data-vue]` de `mobile-fit.css`, que V6Page ne pose plus), `ctafg.py` (texte blanc sur `--cta` → `--cta-fg`).
- `dev/composants` (page interne, retirée du build publié) garde `layouts/Base.astro`, réduit à sa barre classique.
- CLS 0,117 de l’accueil à 390 px (vu une fois en CI) : le premier rendu peut précéder la fin de l’analyse du HTML (héros de 26 px, puis 1 486 px). Le halo `.ac .hero::before` était placé en `inset: -10 %`, donc suivait la hauteur du héros et se déplaçait. Il est maintenant à décalage fixe (`-6rem`) ; test « halo du héros : sa position ne dépend pas de la hauteur du héros ». Reproduit avant le correctif avec un processeur ralenti 6 fois, 0 décalage sur 40 chargements après. Même règle pour le halo de `/sites/:host`.
- Captures connectées : uniquement avec une session simulée locale (`e2e/en-session.ts`, `e2e/h-history.ts`, `node_modules/.tmp/site-shots.mjs`), jamais un vrai compte.
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
- `e2e/sites-compte-v6.spec.ts` : page d’un site (sections, résolveur, site inconnu, clavier, 390 px), `/compte` en sections, redirections R11, R12, R15.

## CI

- Les jobs `statique`, `unitaires`, `publication` et `ui` (4 parts) tournent en parallèle.
- `check`, le check requis, les attend, applique les corrections automatiques et échoue si l'un d'eux échoue.
- `e2e` : parcours réels avec Netlify CLI.
