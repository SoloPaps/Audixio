# Maquette accueil v3 — décisions

## Méthode : « Copie corrigée »

Le site de l'utilisateur est une copie ; Audixio est le correcteur. Cinq règles, appliquées partout :

1. **Le papier.** Fond cahier Seyès (grands carreaux, marge rose). En sombre : l'ardoise, lignes à la craie.
2. **Deux encres seulement.** Encre (texte) et **stylo rouge du correcteur** (signature, action principale, annotations). Le bleu ne sert qu'aux liens.
3. **L'objet signature : le cercle au stylo.** Il entoure « corrigé », la note C, le badge, et trace la boussole. Rien d'autre n'est décoratif.
4. **Deux voix.** Hanken Grotesk pour les faits (titres 850, texte 450) ; Caveat manuscrite pour les commentaires de marge, jamais pour une information indispensable.
5. **Le parcours suit la correction.** On descend pour rendre la copie, on va à droite pendant la correction, on revient à gauche pour ce qu'on en fait, puis on redescend vers les offres.

## Parcours de défilement (desktop ≥ 64rem, mouvement autorisé)

```
 ↓  Héros : h1 « Votre site, corrigé comme une copie. » + champ adresse (seule action principale)
 │
 └──→ Chapitre 1 « La correction, pas à pas »  (piste épinglée, 400vh, va vers la DROITE)
        01 L'adresse ─→ 02 L'audit tourne ─→ 03 Trouvez les problèmes ─→ 04 La note (cercle tracé)
                                                                           │
 ↓  Virage (flèche rouge qui fait demi-tour) ◄─────────────────────────────┘
 │
 └──← Chapitre 2 « Ce que vous faites de la note »  (piste épinglée, 400vh, va vers la GAUCHE)
        08 Lien et badge ←─ 07 Suivi et alerte ←─ 06 Prompt à copier ←─ 05 Priorités
 │
 ↓  Offres (Sans compte · Compte gratuit · Pro bientôt) → FAQ → « À vous de rendre la copie » → pied de page
```

Indicateurs : une **piste** en bas de chaque chapitre (trait rouge qui se remplit, flèche dans le sens du mouvement) et une **boussole** fixe qui dessine le tracé ↓ → ↓ ← ↓ ; la flèche suit le chemin (`offset-path`), pilotée par 5 timelines additionnées (`@property --s1…--s5`, `timeline-scope`).
Mobile, écran bas (< 38rem) ou `prefers-reduced-motion` : tout s'empile verticalement, rien n'est perdu ; la boussole est masquée.
Repli sans `animation-timeline` : 30 lignes de JS calculent la même progression.

## Palette

| Rôle | Clair « copie » | Sombre « ardoise » |
|---|---|---|
| Fond / surface | `#FBFAF5` / `#FFFFFF` | `#16211D` / `#1D2B26` |
| Lignes Seyès / marge | bleu `rgb(64 120 200 / .14–.30)` / `#E7A3A3` | craie `rgb(237 234 223 / .05–.09)` / corail 35 % |
| Encre / encre douce | `#1A2140` / `#4C5470` | `#EEEADF` / `#B4BEB5` |
| Stylo (CTA, signature) | `#D2231B`, texte blanc | `#FF8A7A`, texte `#16211D` |
| Liens | `#2445B5` | `#9CC2FF` |
| Notes A→F | `#0F7A55 #3F7F14 #9A6B00 #B9520F #B3261E #8A1538` | `#6EE0AE #A9DC6C #F2C14E #FFA36B #FF9C92 #FF8FB4` |

## Faits verrouillés

Barème A ≥ 90 · B ≥ 80 · C ≥ 65 · D ≥ 50 · E ≥ 35 · F en dessous. Liens de partage Pro illimités (gratuit : 1). Pas d'IA dans le rapport : un prompt à copier (compte gratuit). Sécurité, vie privée, DNS « sous scellé » sans preuve de propriété. Un seul h1, JSON-LD (Organization, WebSite, WebApplication 0 €, FAQPage).

## Poids

`index.html` 57 Ko + Caveat 75 Ko (OFL, auto-hébergée) + Hanken Grotesk 35 Ko + logo SVG 26 Ko ≈ **193 Ko** (budget 512 Ko). Aucune librairie, aucune image matricielle.
