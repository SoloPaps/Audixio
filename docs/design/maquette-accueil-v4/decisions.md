# Maquette accueil v4 — décisions

Base : v3 « Copie corrigée ». On garde le concept et le parcours ↓ → ↓ ← ↓ (pistes épinglées + boussole). Sélection : `?palette=A|B` et `?theme=light|dark`, plus `?url=domaine.fr` pour pré-remplir la démo.

## Palettes

| Rôle | A « Encre & calque » clair | A sombre | B « Encre de chine & surligneur » clair | B sombre |
|---|---|---|---|---|
| Fond / surface | `#F4F5F0` / `#FFFFFF` | `#0E1726` / `#152135` | `#F7F5EF` / `#FFFFFF` | `#111110` / `#1A1A18` |
| Encre / douce | `#14213D` / `#4B556B` | `#E9EDF3` / `#A8B3C4` | `#0B0B0C` / `#4B4A47` | `#F3F1EA` / `#B3B0A7` |
| Trait signature | émeraude `#0B7A55` | `#3DD39A` | encre `#0B0B0C` | jaune `#FFF200` |
| Bouton principal | `#0B7A55`, texte blanc (5,3:1) | `#3DD39A`, texte `#0E1726` | `#FFF200`, texte `#0B0B0C`, bord noir | `#FFF200`, texte `#0B0B0C` |
| À corriger | orange `#A84A08` | `#FFA559` | étiquette noire sur `#FFF200` | idem |
| Surligneur | émeraude 16 % | émeraude 20 % | `#FFF200` (multiply) | `#FFF200` 38 % |
| Trame | millimétré 8/40 px, 3,5–6 % | 2,5–4,5 % | aucune | aucune |

Notes A→F : clair `#0F7A55 #3F7F14 #9A6B00 #B9520F #B3261E #8A1538` (C en `#8F6300` sur B) ; sombre `#6EE0AE #A9DC6C #F2C14E #FFA36B #FF9C92 #FF8FB4`.

## Changements par rapport à la v3

- Fini le Seyès, la marge rose et le rouge vif. Caveat a été supprimée (−75 Ko). Les annotations sont en petites capitales ou en italique Hanken. Les traits sont des SVG (cercles, soulignés, surligneur, flèches) tracés au défilement : `view()` en vertical, timeline de la piste dans les sections horizontales.
- Démo : l'adresse du héros remplit le chapitre 1 (titre, audit, note, prompt), avec la mention « Aperçu simulé, pas un vrai audit ». Aucune requête n'est envoyée. Le jeu « Trouvez les problèmes » se fait sur `page-exemple.test`.
- Bande de preuves avec les référentiels mesurés, la méthode publique et le mode passif par défaut. Aucun chiffre, client ni témoignage. **[à valider]** sur RGAA, car `FONCTIONNEMENT.md` interdit toute revendication RGAA ; idem sur Core Web Vitals (LCP/CLS mesurés en laboratoire).
- Avant/après : C 67 → B 84, soit la moyenne à poids égaux de 5 domaines (335/5 → 420/5), avec 3 corrections.
- Offre « Pro, bientôt » sans prix. Liens Pro illimités.
- Mobile : sommaire collant à 4 puces numérotées. Parcours raccourci : les panneaux 01 (adresse, en doublon du héros) et 07 (suivi) sont masqués, ainsi que la flèche du virage.

## Poids

`index.html` 70 Ko + Hanken 35 Ko + logo 26 Ko ≈ **131 Ko** (budget 512 Ko).

## Variante B2 (`?palette=B2`, retenue par l'owner ; A et B inchangées)

| Rôle | B2 clair | B2 sombre |
|---|---|---|
| Fond / surface | `#F7F5EF` / `#FFFFFF` | `#0F1115` / `#181B21` |
| Encre / douce | `#0F1115` / `#4B4A47` | `#F3F1EA` / `#B3B0A7` |
| Bouton principal | `#0F1115`, texte `#F7F5EF` | `#FFE14D`, texte `#0F1115` |
| Traits de correction | cercles et flèches `#E0B800` (trait épaissi), surligneur `#FFE14D` (multiply) | `#FFE14D` (surligneur à 36 %) |
| Secondaire : liens, focus, états (piste, boussole, puces actives, nav) | `#2445B5` | `#8FB8FF` |

Les notes A–F sont celles de B. Contrastes du texte et du bouton : AA ou mieux.

## Rééquilibrage du rythme (B2)

Échelle unique : `--sp1…--sp6` = 0,5 / 1 / 1,5 / 2 / 3 / 4 rem ; section `--sec` = `clamp(3.5rem, 2.25rem + 3.5vw, 5.5rem)` ; textes courants ≤ 32–34 rem (≈ 60–75 caractères).

| Section | Avant | Après |
|---|---|---|
| Hero | 100vh, gros vide sous le formulaire, accroche flottante | hauteur au contenu, grille 1,1fr / 0,9fr alignée en haut, accroche raccourcie |
| Preuves | 7 items en 4 colonnes, dernière ligne à moitié vide ; 663 px en mobile | titre + 7 items = 2 lignes pleines (4 col.), 2 col. en tablette ; textes courts ; RGAA / CWV toujours [à valider] |
| Chapitres 1 et 2 (empilés) | vides verticaux autour de petits panneaux | marge `--sec`, gouttière `--sp6`, textes ≤ 32 rem |
| Chapitres 1 et 2 (épinglés) | panneaux à moitié visibles en cours de défilement | temps d'arrêt centré sur chaque panneau, traits dessinés pendant l'arrêt, panneaux agrandis à 112 % sur grand écran |
| Virage | moitié droite vide, flèche surdimensionnée | 2 colonnes texte / flèche |
| Avant / après | flèche lourde, gouttière serrée | flèche 64 × 40, sous-titre et corrections raccourcis |
| Offres | ligne prix / « bientôt » décalée sur Pro | lignes de grille communes, intro raccourcie |
| FAQ | 40 % de la largeur vide à 1440 | 2 colonnes : titre + intro / questions |
| Rythme général | marges incohérentes (`padding-top:0` en ligne) | une seule marge de section, demi-marge entre sections voisines |
| Mobile | preuves très longues | titre sur une ligne, items plus compacts ; résumé collant inchangé |
