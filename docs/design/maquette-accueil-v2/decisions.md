# Maquette accueil v2 — décisions (11 nov. 2026, refonte)

## Méthode : « Procès-verbal suisse »
Style typographique international suisse (grille, alignement à gauche, filets) appliqué au **formulaire administratif français** (procès-verbal, Cerfa, tampon encreur). Audixio est « le contrôle technique de votre site » : un objet que tout le monde connaît, rassurant, qui se lit sans jargon. Personne d'autre ne l'utilise chez les outils d'audit ni chez les SaaS (dégradés, cartes, néon).
1. **Grille** : 4 colonnes en mobile, 12 colonnes à partir de 64 rem ; module de 8 px ; tout est aligné à gauche, rien n'est centré. La grille reste visible au filet dans le héros.
2. **Sections = rubriques de formulaire** : numéro `§ 00…08` en chasse fixe, filet d'encre de 1 px au-dessus, titre en grotesque grasse. Aucune carte arrondie, aucune ombre floue : les seules ombres sont des décalages pleins (6–8 px), comme une feuille posée sur une autre.
3. **Deux voix typographiques, une seule police téléchargée** : Hanken Grotesk variable (100–900) pour tout ce qui se lit comme une phrase, avec un contraste extrême 300 / 850 dans le h1. La chasse fixe système (`ui-monospace`, 0 octet) sert pour tout ce qui est une étiquette : rubriques, champs, numéros, dates.
4. **Un seul accent** : le trait **bleu Bic** (le stylo des formulaires). Il sert au soulignement d'emphase, au bouton principal et à la règle de lecture. Les lettres A–F ont leur encre propre, toujours avec forme + lettre + libellé.
5. **Signature : le tampon** (rond, double filet, lettre, date). Il imprime la note du rapport d'exemple, revient en mini-tampon carré devant chaque point de contrôle, et en tampon vide « en attente » dans le cadre final. Les pointillés de formulaire (`......`) relient libellé et valeur.
6. **Langage de mouvement** : gestes de bureau, courts et physiques. Coup de tampon (420 ms, rebond), compteur qui monte jusqu'à la note (`@property`), mots du h1 qui s'impriment, pointillés qui se remplissent et tampons qui se posent au défilement (`animation-timeline: view()`), règle de lecture (`scroll()`), changement de thème en view transition. En `reduced-motion`, tout est affiché tel quel, à l'état final.

## Gardé / changé
Gardé : la marque Audixio et son logo, le marine comme encre, la copie produit (8 domaines, passif par défaut, horodaté, soft-gate), l'en-tête canon et la barre basse mobile. Changé : tout le reste (palette, typo, composition), qui suit désormais la méthode.

## Palette
Clair : papier `#F4F0E6`, cadre grisé `#EAE4D5`, feuille `#FFFDF7`, encre `#131A3A`, encre 2 `#4A5070`, bleu Bic `#1F3BD1`, focus `#D9480F`.
Sombre (« papier carbone ») : fond `#0D1130`, cadre `#151A40`, feuille `#181E4A`, encre `#F3EEE1`, encre 2 `#BCC0DA`, bleu Bic `#93A7FF`, focus `#FFB27A`.
Encres A→F, clair : `#0F7A55` `#3F7F14` `#9A6B00` `#B9520F` `#B3261E` `#8A1538`. Sombre : `#6EE0AE` `#A9DC6C` `#F2C14E` `#FFA36B` `#FF9C92` `#FF8FB4`.

## Ordre, SEO, UX
§00 héros (h1, champ, procès-verbal d'exemple) → §01 8 points de contrôle → §02 priorités → §03 déroulé → §04 barème public (A ≥ 90, B ≥ 80, C ≥ 65, D ≥ 50, E ≥ 35, F < 35) → §05 engagements → §06 formules (liens Pro illimités) → §07 FAQ → §08 « Cadre réservé à Audixio » (lien vers le champ). Un seul h1 et un seul bouton plein ; JSON-LD Organization, WebSite, WebApplication et FAQPage ; jargon expliqué par un `popover` ancré (anchor positioning). Poids : environ 60 Ko de HTML et CSS, 35 Ko de police, 26 Ko de logo, moins de 1 Ko de JS.
