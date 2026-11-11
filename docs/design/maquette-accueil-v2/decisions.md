# Maquette accueil v2 — décisions (11 nov. 2026)

**Univers : « l'étiquette Audixio ».** Le visiteur connaît déjà l'étiquette énergie (DPE, électroménager) : des barres en escalier de A à F, une flèche sur la lettre. Audixio en fait sa signature : la **règle A–F** (barres en escalier + flèche-note), et une **graduation** fine (traits de mesure) qui borde les sections. Message implicite : on mesure, on ne juge pas, et c'est lisible par tous.

**Signature appliquée partout** : grande étiquette dans le héros, mini-règle devant chaque domaine, flèche-note sur chaque lettre, graduation en filet de section et en pied de page, marqueur d'étape (1·2·3) sur la règle.

**Gardé du design actuel** (`/exemple-rapport`, `tokens.css`, `theme-dark.css`) : famille marine v2 (`#1E2A55`, `#3D52A0`, `#7091E6`, lilas `#EDE8F5`), papier chaud, vouvoiement, copie i18n existante (8 domaines, « passif par défaut », « horodaté »), jetons sombres `--d-*` (mêmes valeurs), statut = lettre + libellé + couleur.
**Changé** : retrait du canvas, des blobs, du curseur custom, de l'ECG et du texte en dégradé (poids, mouvement, cliché) ; Inter remplacé par **Hanken Grotesk** seule (déjà auto-hébergée, 35 Ko) ; onglets « explorateur » remplacés par une liste lisible à plat ; les 3 cartes de formules deviennent un tableau comparatif ; un seul bouton plein sur la page (« Lancer l'audit gratuit »), les autres actions sont des liens.

**Palette clair** : papier `#FAF7F2`, surface `#FFFFFF`, lilas `#EDE8F5`, encre `#1A2246`, encre 2 `#4A5585`, trait `#DCD6E8`, marque `#3D52A0`, CTA `#2B3B85`, focus `#C2410C`, abricot (chaleur, jamais un score) `#F3C7A6`.
**Palette sombre** : fond `#0B0F20`, surface `#1B2347`, sous-surface `#242E58`, trait `#38467C`, texte `#EEEBF8`, texte 2 `#B6BFDC`, accent `#A9BDF6`, CTA `#4760C2`, focus `#FFB98C`.
**Échelle A–F** (clair / sombre) : A `#1F7A4D`/`#86E0B0`, B `#4E8A2A`/`#B5E08A`, C `#B7860B`/`#F4CD6F`, D `#C9601F`/`#FFB98C`, E `#B4382A`/`#FFABA1`, F `#8E2433`/`#F59AAE`.

**Typo** : Hanken Grotesk (400–800, `font-display: swap`), repli `system-ui`. Chiffres tabulaires pour les notes. Titres 2,25→3,5 rem fluides, texte 1,0625 rem, ≤ 66 caractères par ligne.

**Ordre** : en-tête canon → héros (h1, champ, 3 garanties, étiquette d'exemple) → référentiels → « Ce que vous recevez » (verdict + 3 priorités) → 3 étapes sur la règle → 8 domaines (dont 3 verrouillés sans preuve) → transparence (on fait / on ne fait jamais) → formules (tableau) → FAQ → rappel d'action (ancre vers le champ) → pied de page. Annexe : 7 états du champ.

**SEO** : un seul h1, h2 par section, h3 dans les listes ; title 60 car. et meta 150 car. (en commentaire et en balise) ; JSON-LD `Organization` + `WebSite` + `WebApplication` (offre 0 €) + `FAQPage` ; tout le texte est du HTML indexable (aucun texte dans une image ou un canvas).
**UX / a11y** : mobile d'abord (390 px), barre basse collante à 4 destinations ; lien d'évitement ; focus visible 3 px ; contraste texte ≥ 4,5:1 ; `details/summary` natif pour la FAQ ; `prefers-reduced-motion` coupe toute animation ; thème clair par défaut, suit le système, choix manuel prioritaire.
**Perf** : 1 police (35 Ko) + 1 SVG logo (26 Ko) + HTML/CSS inline ≈ 40 Ko ; aucune librairie ; JS ≈ 1 Ko (thème seulement). Total < 120 Ko, budget 512 000 octets.
