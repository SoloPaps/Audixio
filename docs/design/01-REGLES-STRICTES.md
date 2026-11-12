# Audixio : règles strictes de design (v6, 12/11/2026)

Ce fichier remplace la version du 28/10/2026, qui imposait la palette v2, Inter et la fidélité aux maquettes Stitch. Les anciennes versions sont archivées hors du dépôt.

Sources :
- Jetons, composants et mouvement : [`v6/INTEGRATION-v6.md`](v6/INTEGRATION-v6.md).
- Pages, adresses et redirections : [`v6/STRUCTURE.md`](v6/STRUCTURE.md).
- Thème sombre : [`theme-sombre-decisions.md`](theme-sombre-decisions.md).

## 1. Jetons et thèmes

- Clair : jetons `[data-v6]` dans `apps/web/src/styles/tokens.css`. Fond `#F3F5F8`, encre `#0B1220`, faisceau `#1D5FD1`.
- Sombre : seulement dans `theme-dark.css`, par les `--d-*`. Fond `#06090D`, faisceau `#7CC4FF`.
- Aucune couleur, ombre, dégradé ni valeur en px hors jetons. Le test `token-colors` le vérifie.
- Thème clair par défaut. Il suit `prefers-color-scheme`, et le choix manuel gagne. Pas de flash au chargement.

## 2. Typographie

- Police : **Geist** et **Geist Mono**, auto-hébergées. Aucune police tierce.
- Les pages pas encore passées en v6 gardent leurs polices actuelles jusqu'à leur lot. On n'en ajoute pas d'autres.

## 3. Barre et pied

- Une seule barre, `CanonBar`, dont les entrées viennent de `lib/nav-canon.ts`. Un test compare les entrées FR et EN.
- La page active porte `aria-current="page"` et un texte plus gras, sans soulignement (décision owner du 12/11/2026).
- Hauteur fixe : 92 px, ou 78 px sous 900 px. Au défilement, la barre se resserre par un transform (CLS 0).
- Les entrées visiteur, les entrées connecté et le pied de page en 3 colonnes sont décrits dans [`v6/STRUCTURE.md`](v6/STRUCTURE.md).

## 4. Accessibilité

- Texte ≥ 4,5:1, éléments d'interface ≥ 3:1. Un statut ne passe jamais par la couleur seule.
- Liens et boutons réels, focus visible, lien d'évitement, aucun débordement à 320 et 390 px.
- `prefers-reduced-motion` donne une version statique lisible.

## 5. Mouvement

- Animations au défilement autorisées, même osées, à quatre conditions : transform et opacity seulement, CLS 0, aucune tâche longue, et une version réduite statique.

## 6. Interdits

- Violet « IA », emoji décoratifs, noir pur `#000` plein écran.
- Textes en dur : toute chaîne visible passe par `t('clé')`, avec une valeur FR et une valeur EN.

## 7. Droits (inchangé)

- Les droits suivent `docs/produit/MATRICE-STATUT-DROITS-CANON.md`. Chaque capacité limitée a sa variante « Verrouillé ».
- Les détails sensibles ne partent jamais dans une vue verrouillée.
