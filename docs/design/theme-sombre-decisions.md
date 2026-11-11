# Thème sombre — décisions (10 nov. 2026)

Ce document remplace les valeurs sombres de `04-THEME-DARK.md` et de `DESIGN.md` §2.4
pour l’implémentation. Le thème clair ne change pas.

Fichier unique : `apps/web/src/styles/theme-dark.css`.
Garde-fou : `apps/web/src/lib/theme-dark-unique.test.ts`.

## 1. Constat avant refonte

Page de référence analysée : `/exemple-rapport`, puis accueil, rapport, domaine, brief,
sites suivis, compte, connexion, Pro, méthode, pages légales.

- **Sept sources de couleurs sombres** qui se contredisent : `tokens.css` (gris chaud
  `#15181c` + accent sarcelle `#5fc1bc`), `canon.css`, `theme-dark.css` (marine
  `#12162a`), `theme-dark-palette.css`, `theme-dark-pages.css`, `theme-dark-qa.css`,
  `liens.css`, plus des blocs sombres dans 15 feuilles de page et dans `ShareSheet.svelte`.
  Une même carte n’a donc pas la même couleur d’une page à l’autre.
- **Un filet global** forçait tout texte en `#f0f2f5` et tout `div` en transparent.
  Effets : texte secondaire aussi fort que les titres, cartes de la même couleur que le
  fond, pastilles de statut vidées de leur fond, puis des dizaines de correctifs page par
  page pour rattraper le filet.
- **Restes du clair** non traités : centre blanc de la rosace, cartes lilas des maquettes
  de page, bouton blanc « Générer et copier le prompt », bordures `#adbbda` claires.
- **Écart de plans trop faible** : fond `#12162a` contre carte `#1c2340` (contraste 1,16:1),
  sans bordure lisible. On ne distingue pas les blocs.

## 2. Principe : un rôle, un jeton

Le clair écrit ses couleurs en dur (≈ 5 700 valeurs dans 45 feuilles). Plutôt que de
les surcharger une à une (impossible sous le plafond de 512 000 octets de l’accueil),
chaque couleur claire devient :

```css
background: var(--d-sf, #fff);
```

- `--d-sf` est un **jeton de rôle** (ici « surface de carte »).
- Il n’est défini **que** dans `theme-dark.css`, sous `html[data-theme="dark"]`.
- En clair, le jeton n’existe pas : le navigateur prend la valeur de secours, identique à
  l’ancienne valeur en dur. **Le clair est inchangé par construction.**
- En sombre, le jeton existe : toutes les cartes de toutes les pages prennent la même
  couleur. **Cohérence par construction.**

Aucun filet global, aucun `!important`, aucune spécificité gonflée : le sombre ne fait que
donner une valeur aux jetons. Seules les couleurs changent, jamais la mise en page.

Le thème sombre ne s’applique qu’à l’écran (`@media screen`) : l’impression reste toujours
celle du clair. Sans JavaScript, la page reste claire (le script `theme-init.js` pose
`data-theme`, comme avant pour les pages Canon).

## 3. Palette

Famille marine de la palette v2 (`#0B1021`, `#1E2A55`, `#3D52A0`, `#7091E6`, `#8697C4`,
`#EDE8F5`), réglée pour la lecture. Contrastes WCAG mesurés (texte ≥ 4,5:1, bords
d’éléments actifs ≥ 3:1).

### 3.1 Plans (du plus profond au plus haut)

| Jeton | Valeur | Rôle | Pourquoi |
|---|---|---|---|
| `--d-bg` | `#0b0f20` | Fond de page | Proche du « fond abysse » v2 `#0B1021`, jamais noir plat. |
| `--d-sf` | `#1b2347` | Carte, panneau, en-tête | 1,25:1 sur le fond + bordure : les blocs se détachent (avant 1,16:1 sans bordure). |
| `--d-sf2` | `#242e58` | Sous-surface : encart dans une carte, champ, ligne de tableau | Un cran au-dessus de la carte, comme le lilas pâle du clair. |
| `--d-sf3` | `#2e3a68` | Contrôle, puce, survol, onglet actif | Plus haut plan, pour ce qui se clique. |
| `--d-inv` | `#26306a` | Blocs marine du clair (bandeaux, infobulles) | Garde l’effet « bloc fort » avec un marine plus saturé. |
| `--d-gl` | `rgb(27 35 71 / 0.95)` | Verre (barre de navigation, barres collantes, cartes en verre) | Même teinte que la carte, à peine translucide : une barre collante reste opaque (≥ 95 %). |

### 3.2 Traits

| Jeton | Valeur | Rôle | Contraste |
|---|---|---|---|
| `--d-ln` | `#38467c` | Bordure de carte, séparateur | 2,1:1 sur le fond : visible sans être lourd. |
| `--d-ln2` | `#5d6da6` | Bordure de champ, piste de barre, contour de puce | 3,05:1 sur la carte (WCAG 1.4.11). |

### 3.3 Texte et accents

| Jeton | Valeur | Rôle | Contraste |
|---|---|---|---|
| `--d-tx` | `#eeebf8` | Texte principal, titres | 13:1 sur carte. Lilas très pâle de la v2 plutôt que blanc pur (moins d’éblouissement). |
| `--d-mu` | `#b6bfdc` | Texte secondaire, méta | 8,3:1 sur carte, 6:1 sur contrôle. Reste nettement en retrait du texte principal. |
| `--d-ac` | `#a9bdf6` | Lien, texte d’accent, bordure d’accent | 8,2:1 sur carte. Remplace `#3d52a0`, trop sombre sur fond nuit. |
| `--d-ic` | `#8fa9f1` | Icônes, décor, anneau de focus | 6,6:1 sur carte. Version claire de `#7091e6`. |
| `--d-lv` | `#c9c0f2` | Surtitres de section (kicker, eyebrow) | Lavande de la v2 (`#8697C4` éclairci) : un second ton sans violet saturé. |
| `--d-cta` | `#4760c2` | Fond du bouton principal | Texte blanc 5,65:1 ; 3,4:1 sur le fond. |
| `--d-cta2` | `#5670cf` | Fin de dégradé du bouton, fond d’accent | Texte blanc 4,55:1. |
| `--d-t1` | `rgb(143 169 241 / 0.1)` | Teinte d’accent faible (fond d’onglet, puce) | Remplace les voiles `#3d52a0` à 5–9 %. |
| `--d-t2` | `rgb(143 169 241 / 0.18)` | Teinte d’accent forte | Remplace les voiles bleus de 10 à 30 %. |
| `--d-hl` | `rgb(255 255 255 / 0.06)` | Reflet intérieur des ombres | Le reflet blanc à 90 % du clair traçait un filet blanc en haut des cartes. |

### 3.4 Statuts

Un statut n’est jamais porté par la couleur seule (forme + libellé restent). Chaque
famille a trois jetons : texte, fond, bordure.

| Famille | Texte | Fond | Bordure | Usage |
|---|---|---|---|---|
| ok (`--d-ok*`) | `#86e0b0` | `#11301f` | `#2b7a52` | Bon, vérifié, note A |
| er (`--d-er*`) | `#ffaba1` | `#3b1a1d` | `#8f3a3a` | Critique, erreur, note E/F |
| or (`--d-or*`) | `#ffb98c` | `#3a2214` | `#9a5a2e` | À corriger, note D |
| wa (`--d-wa*`) | `#f4cd6f` | `#342a10` | `#8a6a24` | À vérifier, à améliorer, note C |
| in (`--d-in*`) | `#8fdcef` | `#0f2c37` | `#2d7487` | Propriétaire, information |

Texte sur son fond : 8,6:1 à 9,5:1. Texte sur carte : 8,4:1 à 10:1.

## 4. Correspondance clair → rôle

La conversion applique ces règles à chaque valeur en dur, selon la propriété :

- **Fond** : blanc et blanc translucide opaque (≥ 42 %) → `--d-sf` ou `--d-gl` ;
  lilas `#ede8f5` → `--d-bg` ; lilas pâles (`#f7f5fc`, `#f2f4f7`…) → `--d-sf2` ;
  bleus pâles (`#dde4f8`…) → `--d-sf3` ; `#adbbda` (pistes, lignes de squelette) →
  `--d-ln2` ; marine `#1e2a55` → `--d-inv` ;
  `#3d52a0` → `--d-cta` ; voiles bleus → `--d-t1` / `--d-t2` ; fonds pâles de statut →
  `--d-*b`.
- **Texte** : marine → `--d-tx` ; gris-bleu → `--d-mu` ; bleu primaire → `--d-ac` ;
  `#7091e6` → `--d-ic` ; statuts → `--d-ok`, `--d-er`, `--d-or`, `--d-wa`, `--d-in`.
- **Bordure** : `#adbbda` → `--d-ln` ; gris `#d0d5dd` → `--d-ln2` ; accents → `--d-ac` /
  `--d-ic` ; bordures pâles de statut → `--d-*d`.
- **Ombre** : seul le reflet blanc change (→ `--d-hl`). Les ombres bleues restent.
- **Inchangé** : texte blanc (déjà posé sur un fond coloré), voiles blancs ≤ 30 % (déjà
  pensés pour un fond sombre), couleurs vives des graphiques et des pétales, masques.
- `var(--primary)` et `var(--accent)` en **fond** passent par `--d-cta` / `--d-cta2` :
  ces variables servent à la fois de texte et de fond de bouton, et aucun bleu ne peut
  être lisible dans les deux rôles sur fond nuit.

Les variables de page (`--bg`, `--text`, `--muted`, `--line`, `--crit-bg`…) suivent la
même conversion à leur définition : elles prennent le jeton sombre sans être redéclarées.

Cas particuliers de la conversion :

- **Texte en dégradé** (`background-clip: text`) : les arrêts prennent des rôles de texte
  (`--d-ac`, `--d-ic`, `--d-tx`, `--d-mu`), jamais un rôle de fond.
- **Fond de page** : la fin du dégradé de page prend `--d-bg` (le clair éclaircit vers
  `#adbbda`, ce qui donnerait une tache claire en bas des pages sombres).
- **Voiles d’aurore** (blanc 25 % sur les en-têtes) → `--d-hl` ; halos pêche → `--d-t1`.
- **SVG** : un attribut `fill="…"` n’accepte pas `var()`. Le rôle passe par `style`
  (`style="fill:var(--d-tx, #1e2a55)"`) ou par une classe ; l’attribut garde le clair.
- **Canvas** (radar du constat, orbite du brief) : `lib/theme-role.ts` lit le rôle au
  moment du dessin (`roleColor('sf', '#fff')`) ; le canvas se redessine au changement
  de thème.
- **`tokens.css`** garde ses valeurs claires en dur ; le fichier unique relaie ses
  variables (`--paper`, `--ink`, `--glass`, `--score-*`…) vers les rôles.
- **Pêche** (`--peach-fill`, `--on-peach`, `--peach-border`) : identique dans les deux
  thèmes.

## 5. Exceptions écrites dans le fichier unique

Peu nombreuses, toutes dans `theme-dark.css` :

- logos en blanc (`filter`), y compris la couverture de l’aperçu PDF ;
- surtitres de section en lavande (`--d-lv`) ;
- textes indicatifs des champs et étapes en attente : pleine opacité (sinon trop pâles) ;
- aperçu du badge : la scène reste claire, car le badge s’affichera sur un site clair ;
- encart hors session en écran étroit : fond opaque `--d-sf`.

## 6. Ce qui disparaît

- `tokens.css`, `canon.css`, `chrome.css` et les feuilles de page : plus aucune règle
  `[data-theme="dark"]` ni `prefers-color-scheme: dark`.
- `theme-dark-palette.css`, `theme-dark-pages.css`, `theme-dark-qa.css`,
  `theme-dark-extra.css` : supprimés.
- Le filet global sur `div`, `span`, `p`… : supprimé.

## 7. Garde-fous

- Test Vitest `theme-dark-unique.test.ts` : échoue si un sélecteur sombre
  (`[data-theme="dark"]`, `:not([data-theme="light"])`, `@media (prefers-color-scheme:
  dark)`) ou une définition de jeton `--d-*` apparaît hors de `theme-dark.css`, si un
  jeton utilisé n’est pas défini dans la palette, si une règle du fichier unique ne
  commence pas par `html[data-theme="dark"]`, ou si une ancienne feuille
  `theme-dark-*.css` revient.
- Les tests Playwright existants (contraste axe en sombre, géométrie clair = sombre,
  pixels du clair) restent tous actifs.
- Budget de l’accueil (512 000 octets) : le fichier unique, sans filet ni doublons, pèse
  moins que les règles sombres qu’il remplace.
