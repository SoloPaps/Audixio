# Maquette accueil — décisions

**Parti pris : « le relevé de mesure ».** Audixio ne vend pas un tableau de bord SaaS, il délivre un constat d'expert. La page emprunte au monde du laboratoire et du procès-verbal : papier, encre, graduations, tampon, référence horodatée. **Signature : la règle graduée 0–100**. Elle porte la note (curseur), le barème A–F, les séparateurs de sections et la barre de chargement. La note est un **tampon carré** (lettre + /100), toujours accompagné d'un libellé.

- **Visiteur** : particulier ou petite structure qui veut savoir « mon site va bien ? » en 5 s ; second niveau = dév/freelance qui veut le détail. Objectif unique : saisir une adresse et lancer l'audit.
- **Hiérarchie** : 1 Champ d'audit + fiche exemple (comprendre + agir) → 2 Barème (lire la note) → 3 Les 8 domaines en nomenclature (ce qui est mesuré) → 4 Déroulé horodaté (ce qui se passe) → 5 Protocole (pourquoi faire confiance : passif par défaut, sans traceur, méthode publique, référentiels) → 6 Formules en tableau comparatif (sans compte / compte / Pro bientôt) → 7 FAQ → 8 rappel du champ → pied légal. Annexe : états du formulaire.
- **Palette clair** : papier `#F3F0E8`, surface `#FBFAF6`, encre `#16181B`, encre douce `#53575D`, filet `#D6D0C2`, accent « rouge correcteur » `#B0301C` (réservé aux marques de mesure, au curseur et au focus). Statuts : bon `#1F6B43`, à améliorer `#8A5A00`, problème `#B0301C` — toujours avec forme + mot.
- **Palette sombre « chambre noire »** : fond `#121314`, surface `#1A1C1E`, encre `#ECE8DF`, encre douce `#A6A49C`, filet `#34363A`, accent `#FF7A5C`, statuts `#6CC895` / `#E3B04B` / `#FF7A5C`. Pas de noir pur.
- **Typographie** (polices système, zéro requête) : titres en serif de livre (`Iowan Old Style`, `Palatino`, `Georgia`), texte en sans système, mesures/références/URL en monospace. Le contraste serif + mono donne le ton « rapport d'expertise ».
- **Grille** : 12 colonnes, max 1200 px, gouttière 24 px ; marges fluides `clamp(16px, 4vw, 48px)` ; 1 colonne sous 720 px ; le tableau des formules devient une liste empilée sur mobile.
- **Interaction** : un seul bouton plein (Lancer l'audit). Liens soulignés. Focus = contour 2 px accent + décalage. Thème : suit le système, bouton manuel prioritaire (mémorisé). `prefers-reduced-motion` coupe l'animation du curseur et du chargement.
- **Barème** : celui du code (`GRADE_THRESHOLDS`) : A ≥ 90, B ≥ 80, C ≥ 65, D ≥ 50, E ≥ 35, F en dessous. La brief parlait de A–E ; le F existe dans le produit, donc il est affiché.
- **Refusé** : dégradés violets, glassmorphism, blobs, grilles de cartes à icônes, emoji, compteurs « +10 000 sites », logos clients inventés, texte en dégradé, faux témoignages, hero centré générique, illustrations 3D.
- **Logo** : wordmark texte provisoire ; à remplacer par le fichier officiel de `docs/design/logos/audixio-logos/out/`.
- **EN** : toutes les chaînes sont regroupées par bloc pour passer en clés `t()` ; le sélecteur FR/EN est présent dans l'en-tête.
