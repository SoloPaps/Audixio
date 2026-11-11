# Audixio v6 : notes d'intégration (Astro, Svelte, TypeScript, apps/web)

Maquette : `/workspace/v5c/audixio-v6.html`. C'est un fichier autonome de 213 Ko qui s'ouvre d'un double-clic. Il est généré par `build6.py` à partir de `src6/`.

**Base retenue :** `radiographie-v3.html`, en thème clair, comme sur la capture de l'owner : « À vous de jouer » est suivi de « Atelier ». On reprend de la v3, quasiment tels quels :

- l'en-tête, le héros, « Comment ça marche », les 8 domaines, la vue éclatée et « À vous de jouer » ;
- le pied de page.

Tout ce qui suit « À vous de jouer » est refait. La barre de sections est ajoutée.

## 1. Sources

| Fichier | Contenu |
|---|---|
| `src6/shell.html` | `<head>`, script de thème et garde polices, inclusions |
| `src6/tokens.css` | **Source unique des jetons** : sombre sur `:root`, clair sur `:root[data-theme=light]`, constantes radiographie, jetons v6 |
| `src6/kept.css` | CSS des sections conservées de la v3. Toutes les couleurs passent par des jetons (0 hex, 0 `rgb()`) |
| `src6/s6.css` | Nouvelles sections, langage des liens et boutons, barre de sections, retouches des sections conservées, tailles réservées |
| `src6/icons.html` | Sprite SVG : logo, icônes d'interface `i-*`, icônes de domaine `ic-*` |
| `src6/b-top.html`, `b-dom.html` | En-tête, barre de sections, héros, comment, 8 domaines (gabarit), vue éclatée, jeu |
| `src6/b-new.html` | Rapport, Après la note, Offres, Questions, Appel final, pied de page |
| `src6/content-fr.json` | Contenus générés au build : faux site, zones, 8 domaines. C'est le futur catalogue FR |
| `src6/i18n-fr.json` | Chaînes utilisées par le JS (thème, statut du scan, compteur du jeu, barre de sections), intégrées dans `<script type=application/json id=i18n-fr>` |
| `src6/app6.js` | Une fonction `initX(el)` par composant, qui renvoie `destroy()`. Aucun texte en dur |

Depuis la v3 :

- le faux site, les onglets, les zones, les bulles et les 8 panneaux sont **générés au build** dans le HTML, et non plus en JS au chargement ;
- le JS ne fait que basculer des classes et des attributs ;
- il n'y a plus de texte dans le JS.

## 2. Composants (`data-component`)

| Composant | Rôle | Props / données | États |
|---|---|---|---|
| `SiteHeader` | Logo, nav, EN, thème, connexion, barre de progression `--sp` | `links[]`, `loginHref`, `langHref` (**EN = `#`, route à confirmer**) | `theme` dark/light (`?theme=`), progression au défilement |
| `SectionDock` (nouveau) | Barre de sections sticky en bas de l'écran | `sections[] {id, n, label}` | `on` (masquée sur le héros, l'appel final et le pied), section active (`aria-current="location"`), `open` en mode compact (`aria-expanded`, Escape, clic extérieur) |
| `HeroScan` | Héros : badge, H1, chapeau, formulaire, garanties, scanner | — | — |
| `ScanForm` | Champ URL et bouton (héros `#scan`, appel final) | `id`, `action` | `idle` / `invalid` (`.err`, `aria-invalid`) |
| `TrustLine` | Garanties cochées | `items[]` | — |
| `LiveScan` | Scanner simulé : rendu / rayons X, faisceau, journal, note en anneau | `steps[] {at, ok, title, sub}`, `score` 67 | Boucle de 7 s, **en pause hors écran** (rAF arrêté) ; mouvement réduit : état final |
| `HowItWorks` | 3 étapes (saisie, anneau 8 segments, mini-rapport) | `steps[]` | Animations jouées une fois à l'apparition |
| `VideoPlaceholder` | « Vidéo à venir » et lien vers /methode | `href` | Statique |
| `DomainsXray` | 8 onglets, radiographie à zones, bulle « Exemple de constat », panneau | `domains[]`, `zones{}` (en %) | Onglet actif (flèches, Home, End), autoplay de 5,5 s visible à 35 %, arrêt définitif à l'interaction, panneaux empilés (`visibility`, `inert`) |
| `ExplodedView` | 4 couches épinglées au défilement | `layers[] {title, count, capT, capD}` | Progression `--p` ; mouvement réduit : statique |
| `SpotGame` | « À vous de jouer » : 4 points, Rayons X, Tout montrer | `spots[] {x%, y%, label}` | `aria-pressed` par point, compteur `aria-live` |
| `ReportPreview` (nouveau) | Présente le rapport : 3 clés et un aperçu annoté | `keys[]`, `report {grade, score, domains[], priorities[], finding}` | Clé active (`aria-pressed`, survol, focus ou clic) qui éclaire la zone `data-a` ; barres et lettre animées à l'apparition |
| `AfterNote` (nouveau) | Corriger / Partager / Suivre : 3 cartes avec visuel | `features[] {tag, title, text, href, visual}` | Apparition échelonnée, coches, badge, courbe dévoilée ; mobile : rangée glissante, focusable seulement si elle défile |
| `Plans` (nouveau) | Sans compte / Compte gratuit / Pro bientôt | `plans[] {kind, label, features[], cta}` | Idem mobile (rangée glissante) |
| `Faq` | 3 questions et carte-lien vers /methode | `items[] {q, a, link?}` | Ouvert / fermé, Escape referme |
| `FinalCta` | Appel final et formulaire | — | Faisceau `--fx` (translate) tant que visible |
| `SiteFooter` | Pied de la v3, liens soignés | `cols[]` | — |
| `Lnk` / `CardLink` / `Btn` / `BtnS` | Langage commun des liens | `href`, `icon`, `label`, `sub?`, `variant` | Survol, `:active`, `:focus-visible` (voir § 3) |
| `GradeChip` (`.g.g-X`) | Lettre A–F | `grade` | Couleur `--gX` |

## 3. Langage des liens et boutons

- **`.btn`** (principal) :
  - survol : fond `--cta-h`, ombre teintée, flèche décalée de 3 px ;
  - `:active` : décalage de 1 px et échelle .99.
- **`.btn--ghost`** (secondaire) :
  - survol : fond `--c-hover`, bord `--beam` ;
  - `:active` : `--c-active`.
- **`.btn-s`** : bouton pilule secondaire, par exemple « Tout montrer » avec une icône œil.
- **`.lnk`** (lien texte) :
  - pastille d'icône, libellé, flèche ;
  - survol : soulignement animé (`background-size`), pastille pleine, flèche décalée de 4 px.
- **`.card-l`** (carte-lien) :
  - icône en boîte, titre, sous-titre, flèche ;
  - survol : bord `--beam`, élévation de 2 px, flèche décalée.
- **Nav du header** : soulignement `scaleX`.
- **Pied de page** : soulignement animé et couleur `--beam`.
- **Focus** : anneau unique `outline: var(--focus-w) solid var(--c-ring)` avec un décalage de 3 px. Il ne faut pas le surcharger dans les composants.

## 4. Jetons

Il n'y a qu'une source, `src6/tokens.css` (149 jetons, dont 29 surchargés en clair).

- Les sections conservées et les nouvelles ne contiennent aucune couleur en dur.
- **Limite connue :** dans `kept.css` (sections v3), les tailles, espacements et rayons sont encore littéraux (rem/px), comme dans la v3. Seules les couleurs y sont en jetons. Les nouvelles sections utilisent `--s-*`, `--r-*`, `--d-*`, etc.
- Pour l'intégration, convertir `kept.css` au fil des composants vers l'échelle `--s-*` (espacement en multiples de 4 px).

### Couleurs d'interface (changent avec le thème)

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--bg` | `#06090D` | `#F3F5F8` |
| `--bg-2` | `#080C12` | `#EBEFF4` |
| `--surf` | `#0C121A` | `#FFFFFF` |
| `--surf-2` | `#111924` | `#F2F5F9` |
| `--surf-3` | `#16202D` | `#E3E9F0` |
| `--line` | `#1B2633` | `#D5DCE6` |
| `--line-2` | `#263445` | `#C3CDDA` |
| `--ink` | `#E8EEF6` | `#0B1220` |
| `--ink-2` | `#93A1B5` | `#4A5568` |
| `--ink-3` | `#7A889C` | `#5B677A` |
| `--beam` | `#7CC4FF` | `#1D5FD1` |
| `--beam-a` | `rgb(124 196 255/.16)` | `rgb(29 95 209/.10)` |
| `--beam-b` | `rgb(124 196 255/.32)` | `rgb(29 95 209/.25)` |
| `--find` | `#FF7A6B` | `#C2341F` |
| `--find-a` | `rgb(255 122 107/.14)` | `rgb(194 52 31/.08)` |
| `--ok` | `#5EE0B0` | `#0F7A55` |
| `--ok-a` | `rgb(94 224 176/.12)` | `rgb(15 122 85/.08)` |
| `--focus` | `#B9DCFF` | `#1D5FD1` |
| `--cta` | `#7CC4FF` | `#0B1220` |
| `--cta-fg` | `#061018` | `#FFFFFF` |
| `--cta-h` | `#A3D6FF` | `#24324A` |

### Lettres A à F

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--gA` | `#5EE0B0` | `#0F7A55` |
| `--gB` | `#A9DC6C` | `#3F7F14` |
| `--gC` | `#F2C14E` | `#8F6300` |
| `--gD` | `#FFA36B` | `#B9520F` |
| `--gE` | `#FF8F86` | `#B3261E` |
| `--gF` | `#FF8FB4` | `#8A1538` |
| `--gB-x` | `#A9DC6C` | = sombre |
| `--gC-x` | `#F2C14E` | = sombre |
| `--gD-x` | `#FFA36B` | = sombre |
| `--gC-w` | `#8F6300` | = sombre |

### Radiographie et faux site (constants)

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--x-bg` | `#081420` | = sombre |
| `--x-line` | `#3A6E9C` | = sombre |
| `--x-ink` | `#B5DAFF` | = sombre |
| `--fs-bg` | `#FFFFFF` | = sombre |
| `--fs-block` | `#C9CED6` | = sombre |
| `--fs-block-2` | `#E1E4E9` | = sombre |
| `--fs-btn` | `#4B556B` | = sombre |
| `--fs-field` | `#DDD` | = sombre |
| `--fs-img-a` | `#D9DFE8` | = sombre |
| `--fs-img-b` | `#9AA6B8` | = sombre |
| `--fs-img-c` | `#B8C2D1` | = sombre |
| `--fs-img-d` | `#8B97AA` | = sombre |
| `--fs-ink` | `#2B2F38` | = sombre |
| `--fs-pale` | `#C3C3C3` | = sombre |
| `--fs-pale-2` | `#bbb` | = sombre |
| `--k-shade` | `rgb(0 0 0/.8)` | = sombre |
| `--k-shadow` | `rgb(0 0 0/.7)` | `rgb(11 18 32/.22)` |
| `--k-white` | `#fff` | = sombre |
| `--xr-beam` | `#7CC4FF` | = sombre |
| `--xr-beam-a` | `rgb(124 196 255/.10)` | = sombre |
| `--xr-beam-b` | `rgb(124 196 255/.35)` | = sombre |
| `--xr-beam-c` | `rgb(124 196 255/.25)` | = sombre |
| `--xr-beam-d` | `rgb(124 196 255/.55)` | = sombre |
| `--xr-beam-e` | `rgb(124 196 255/.08)` | = sombre |
| `--xr-bg` | `#081420` | = sombre |
| `--xr-bg-2` | `#0B1C2D` | = sombre |
| `--xr-bg-3` | `#061019` | = sombre |
| `--xr-bg-4` | `#16293D` | = sombre |
| `--xr-bg-5` | `#0E1B29` | = sombre |
| `--xr-edge` | `#1F3247` | = sombre |
| `--xr-find` | `#FF7A6B` | = sombre |
| `--xr-find-a` | `rgb(255 122 107/.08)` | = sombre |
| `--xr-find-b` | `rgb(255 122 107/.10)` | = sombre |
| `--xr-find-c` | `rgb(255 122 107/.25)` | = sombre |
| `--xr-find-d` | `rgb(255 122 107/.5)` | = sombre |
| `--xr-find-fg` | `#1A0805` | = sombre |
| `--xr-find-ink` | `#FFE1DC` | = sombre |
| `--xr-find-k` | `#FF9C90` | = sombre |
| `--xr-grid` | `rgb(124 196 255/.05)` | = sombre |
| `--xr-hi` | `#D6ECFF` | = sombre |
| `--xr-ink` | `#B5DAFF` | = sombre |
| `--xr-ink-2` | `#8DB4DA` | = sombre |
| `--xr-ink-3` | `#8EA9C4` | = sombre |
| `--xr-ink-4` | `#7FA3C6` | = sombre |
| `--xr-l1` | `#3A73A8` | = sombre |
| `--xr-l3` | `#2FB8A8` | = sombre |
| `--xr-line` | `#33557A` | = sombre |
| `--xr-line-2` | `#3A6E9C` | = sombre |
| `--xr-lock` | `#9FB3C8` | = sombre |
| `--xr-lock-a` | `rgb(159 179 200/.08)` | = sombre |
| `--xr-lock-b` | `rgb(159 179 200/.5)` | = sombre |
| `--xr-mute` | `#C7D3E0` | = sombre |
| `--xr-mute-2` | `#B9C6D6` | = sombre |
| `--xr-ok` | `#2FB88A` | = sombre |
| `--xr-ok-a` | `rgb(94 224 176/.06)` | = sombre |
| `--xr-ok-fg` | `#03140D` | = sombre |
| `--xr-ok-k` | `#5EE0B0` | = sombre |
| `--xr-spot-bg` | `rgb(6 9 13/.8)` | = sombre |
| `--xr-tag` | `#16202D` | = sombre |
| `--xr-tag-dark` | `#061018` | = sombre |
| `--xr-tag-ink` | `#E8EEF6` | = sombre |
| `--xr-veil` | `rgb(8 20 32/.9)` | = sombre |
| `--xr-veil-2` | `rgb(8 20 32/.86)` | = sombre |
| `--xr-veil-3` | `rgb(8 20 32/.2)` | = sombre |
| `--xr-veil-4` | `rgb(8 20 32/.92)` | = sombre |

### Typographie

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--sans` | `"Geist",system-ui,sans-serif` | = sombre |
| `--mono` | `"Geist Mono",ui-monospace,monospace` | = sombre |
| `--t-xs` | `.75rem` | = sombre |
| `--t-sm` | `.8125rem` | = sombre |
| `--t-md` | `.9375rem` | = sombre |
| `--t-base` | `1.0625rem` | = sombre |
| `--t-h3` | `1.25rem` | = sombre |

### Espacement, rayons, tailles

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--hh` | `64px` | = sombre |
| `--sec` | `clamp(4.5rem,3rem + 5vw,8rem)` | = sombre |
| `--s-1` | `.25rem` | = sombre |
| `--s-2` | `.5rem` | = sombre |
| `--s-3` | `.75rem` | = sombre |
| `--s-4` | `1rem` | = sombre |
| `--s-5` | `1.25rem` | = sombre |
| `--s-6` | `1.5rem` | = sombre |
| `--s-7` | `2rem` | = sombre |
| `--s-8` | `2.5rem` | = sombre |
| `--s-9` | `3rem` | = sombre |
| `--s-10` | `4rem` | = sombre |
| `--r-sm` | `8px` | = sombre |
| `--r-md` | `12px` | = sombre |
| `--r-lg` | `16px` | = sombre |
| `--r-xl` | `22px` | = sombre |
| `--r-pill` | `999px` | = sombre |
| `--ic` | `20px` | = sombre |
| `--ic-sm` | `16px` | = sombre |
| `--ib` | `2.4rem` | = sombre |
| `--tap` | `44px` | = sombre |
| `--ctl-h` | `52px` | = sombre |
| `--bw` | `1px` | = sombre |
| `--focus-w` | `3px` | = sombre |
| `--focus-off` | `3px` | = sombre |
| `--dock-h` | `48px` | = sombre |
| `--dock-gap` | `14px` | = sombre |
| `--dock-space` | `calc(var(--dock-h) + var(--dock-gap)*2)` | = sombre |
| `--w-dock-panel` | `17rem` | = sombre |
| `--pin` | `1.5rem` | = sombre |
| `--g-chip` | `1.75rem` | = sombre |
| `--g-chip-lg` | `3.4rem` | = sombre |
| `--bar-h` | `.45rem` | = sombre |
| `--w-text` | `38rem` | = sombre |

### Mouvement

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--ease` | `cubic-bezier(.22,1,.36,1)` | = sombre |
| `--d-fast` | `.15s` | = sombre |
| `--d-med` | `.3s` | = sombre |
| `--d-slow` | `.6s` | = sombre |
| `--d-reveal` | `.7s` | = sombre |
| `--rv-y` | `22px` | = sombre |

### Ombres et états

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--shadow` | `0 30px 60px -30px rgb(0 0 0/.7)` | `0 30px 60px -34px rgb(11 18 32/.35)` |
| `--sh-lift` | `0 22px 44px -26px var(--k-shadow)` | = sombre |
| `--sh-dock` | `0 18px 40px -18px var(--k-shadow)` | = sombre |
| `--c-hover` | `color-mix(in oklab,var(--beam) 8%,var(--surf))` | = sombre |
| `--c-active` | `color-mix(in oklab,var(--beam) 14%,var(--surf))` | = sombre |
| `--c-ring` | `var(--focus)` | = sombre |
## 5. Points de vigilance pixel-perfect

1. **Polices.**
   - Geist et Geist Mono en woff2 (sous-ensembles), embarquées en base64. Tous les caractères du texte sont couverts : vérifié avec fontTools.
   - → et ✓ ont été remplacés par les icônes `#i-arrow` et `#i-check` ; ↓ par `#i-down`.
   - Dans Astro : woff2 locaux, `preload`, mêmes poids.
2. **Garde polices (`.fl` + « warm »).**
   - Le `<body>` est masqué jusqu'au chargement de Geist 600 et Geist Mono 500, puis les combinaisons de police du héros sont chauffées par lots de 3. Délai de sécurité : 1500 ms.
   - Sans elle, on mesure un CLS de 0,15 et une tâche longue de 132 ms au premier chargement.
   - À placer dans un script inline du `<head>` d'Astro.
3. **Faux site.**
   - Police `var(--sans)`, plus `system-ui` : cela évite les recherches de police de secours, source de tâches longues.
   - Positions en % (`--l/--t/--w/--h`), typographie en `cqi` dans un cadre `aspect-ratio` qui sert de conteneur : `.viewport` 16/8.6, `.film` 16/11, `.gv .vp` 16/9, `.feat-v` 16/9 (16/8.5 sous 48rem).
4. **Animations.**
   - Seulement `transform` et `opacity` : le faisceau, `travel`, `fsweep` et le faisceau final sont passés de `left` à `translate` en `cqi`.
   - Exception héritée de la v3 : le dévoilement rayons X du héros anime `clip-path` (pas de reflow).
5. **Vue éclatée, CLS = 0.**
   - Sur grand écran, les descriptions de couches sont toujours dépliées (seule l'opacité change).
   - Sur mobile, la légende a une hauteur fixe de 2 lignes pour le titre et 2 pour le texte.
   - Le cadre réserve `--dock-space` en bas pour la barre de sections.
6. **Panneaux des 8 domaines.** Ils sont empilés en grille (`grid-area:1/1`) et la hauteur suit le plus grand panneau : pas de saut à l'autoplay.
7. **`content-visibility:auto`.**
   - Il s'applique aux sections après le héros (sauf la vue éclatée, à cause de l'épinglage) et au pied, avec `contain-intrinsic-size:auto var(--cis)`.
   - Hauteurs mesurées :

     | Largeur | comment | domaines | jeu | rapport | suite | offres | faq | fin | pied |
     |---|---|---|---|---|---|---|---|---|---|
     | 1440 | 1228 | 1246 | 892 | 811 | 773 | 696 | 377 | 406 | 420 |
     | 390 | 1818 | 1463 | 1071 | 1721 | 738 | 705 | 571 | 517 | 912 |

   - À re-mesurer à chaque changement de contenu.
8. **Points de rupture.**
   - Valeurs : 40, 48, 64 et 85rem. 85rem est la largeur à partir de laquelle la barre de sections affiche la liste complète ; en dessous, elle est compacte.
   - Les media queries ne lisent pas les variables : utiliser `@custom-media` ou des constantes TS.
9. **Barre de sections.**
   - `position:fixed`, centrée à partir de 85rem (largeur mesurée : 893 px à 1440).
   - En compact, elle est collée à droite (16rem), puis occupe toute la largeur sous 40rem.
   - La section active est la dernière dont le haut a franchi 45 % de la hauteur de l'écran.
   - Le pied réserve `--dock-space` en bas.
10. **Rangées glissantes mobiles** (`[data-snap]`) : `scroll-snap`, marges négatives de `--gutter-m`. Aucun débordement de page : `scrollWidth` vaut 390.

## 6. Procédure de comparaison visuelle (maquette vs site)

1. **Gel.**
   - `?theme=dark|light` et `reducedMotion:'reduce'` : scan à l'état final, vue éclatée statique, pas d'autoplay.
   - Injecter `main>section,footer{content-visibility:visible!important} .dock{display:none}`.
   - Attendre `document.fonts.ready` puis 300 ms.
2. **Captures.**
   - Points de départ : `planche6.py` (pleine page) et `v6check.py` (par section, en mouvement normal).
   - Viewports 1440×900, 1024×768 et 390×844, en sombre et en clair.
   - Une capture par `[data-component]`, plus la page entière, plus les états de la barre de sections (fermée, ouverte).
3. **Diff pixels** avec pixelmatch ou odiff, `threshold 0.1`, anti-aliasing ignoré.
   - **Seuils :**
     - ≤ 0,5 % de pixels différents par composant ;
     - ≤ 1 % sur la page entière ;
     - écart de hauteur de section ≤ 2 px.
4. **Diff de boîtes.** Comparer `getBoundingClientRect()` de `h1, h2, h3, .btn, .lnk, .card-l, .tab, .feat, .plan, .dock a` : écart ≤ 1 px.
5. **Garde-fous** (`v6check.py`) :
   - 0 erreur console, 0 requête externe ;
   - `scrollWidth` égal au viewport à 390 ;
   - CLS < 0,005 (cible 0) ;
   - 0 tâche longue (navigateur froid, avec `lt2.py`) ;
   - parcours Tab avec un anneau sur chaque arrêt ;
   - formulaire visible à 390 ;
   - barre de sections masquée sur le héros et sur l'appel final.

## 7. Ce qui reste délicat à transposer

- La garde polices `fl`/warm : un script inline, avant le rendu.
- Les tailles réservées de `content-visibility`, à re-mesurer.
- La vue éclatée : épinglage, `perspective` et 440vh de défilement. Elle a besoin d'un composant client avec écouteur de défilement, à désactiver en mouvement réduit.
- Le scanner du héros : une boucle rAF à mettre en pause hors écran. Dans Svelte, utiliser une action qui gère l'IntersectionObserver.
- La position des bulles des 8 domaines, calculée au build à partir des zones (formule dans `build6.py`). À porter en TS.
- `kept.css` garde des tailles littérales héritées de la v3 (voir § 4).
- La barre de sections : synchroniser la section active avec le routeur Astro si les ancres changent, et ne pas la doubler avec la nav du header sur mobile.
