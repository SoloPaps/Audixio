# Audixio — Refonte du design : sobre, éditorial, pas « généré par IA »

Document de consigne pour refaire toutes les pages. À donner tel quel à Cursor ou à tout autre outil, et à relire avant chaque nouvelle page.

> **But.** Audixio audite le site des autres. Le design doit inspirer la confiance d'un rapport d'expertise, pas impressionner comme une page d'accueil de startup. Calme, précis, lisible.

---

## 1. Idée directrice : « le dossier d'expertise »

Chaque page ressemble à un document sérieux qu'on lirait posé sur un bureau :

- fond uni, grandes marges, une colonne de lecture bien tenue ;
- numéros de section (01, 02…), références, dates, version de la méthode ;
- la donnée est la vedette : score, domaines, preuves, en tableaux nets ;
- une seule couleur d'accent, utilisée avec parcimonie ;
- aucun effet qui ne transmette pas une information.

Test à se poser pour chaque élément : *« si je l'enlève, l'utilisateur perd-il quelque chose ? »* Si non, on l'enlève.

---

## 2. Ce qu'on interdit (les signes d'un site généré par IA)

À supprimer partout, sans exception :

| Interdit | Pourquoi |
|---|---|
| Texte en dégradé, surtout animé | Signe n°1 d'un modèle généré |
| Bulles / orbes flottantes en arrière-plan | Décoratif, sans information |
| Verre dépoli (`backdrop-filter`), flou d'aperçu comme décor | Effet de mode, nuit à la lisibilité |
| Rotation 3D, `perspective`, inclinaison au survol | Gadget |
| Animation des mots du titre (apparition mot à mot) | Retarde la lecture |
| Courbe à rebond (`cubic-bezier(.34,1.56,.64,1)`) | Donne un aspect « jouet » |
| Reflet qui balaie un bouton, ondulation au clic | Gadget |
| Objets qui flottent ou pulsent en boucle (cadenas, icône) | Distrait, fatigue |
| Boutons en pilule (`border-radius: 99px`) partout | Look standard des générateurs |
| Rayons énormes (24–28 px) sur toutes les cartes | Idem |
| Ombres colorées très diffuses, effet « lévitation » | Idem |
| Grille de 3 cartes « icône + titre + 2 lignes » | Structure type des générateurs |
| Icône Material dans un rond sur chaque carte | Idem |
| Contrôles qui ne font rien (ex. bouton thème sombre « non implémenté ») | Faux contrôle : à retirer tant que ce n'est pas réel |
| Même phrase répétée à deux endroits d'une page | Remplissage |
| Titres creux (« Une expérience unique », « Passez au niveau supérieur ») | Aucun contenu |
| Chiffres inventés présentés comme réels | Contraire à la mission d'Audixio |

---

## 3. Fondations

### 3.1 Couleurs (on garde la palette lavande/bleu, mais on la discipline)

| Rôle | Valeur | Usage |
|---|---|---|
| Fond de page | `#FFFFFF` ou `#FAF8FD` | Fond uni, pas de dégradé |
| Surface | `#FFFFFF` | Bloc de contenu, bordure fine |
| Trait fin | `#D9DEEC` | Filets, séparateurs, bordures |
| Texte | `#1E2A55` | Texte principal |
| Texte secondaire | `#4A5585` | Aides, légendes |
| Accent (unique) | `#3D52A0` | Liens, bouton principal, état actif |
| Critique | `#B42318` | Erreur, faille grave |
| Alerte | `#B54708` | Avertissement |
| Réussi | `#067647` | Test réussi |

Règles :
- **Une seule couleur d'accent** (`#3D52A0`). `#7091E6` et `#8697C4` ne servent plus qu'aux graphiques.
- Les couleurs critique / alerte / réussi **ne servent qu'à l'état d'un résultat**, jamais à décorer.
- Toujours un contraste suffisant (AA minimum : 4,5:1 pour le texte) — à vérifier sur chaque combinaison.
- Le thème sombre est un vrai second thème (variables redéfinies) ou n'existe pas. Pas de bouton factice.

### 3.2 Typographie

- **Titres : une serif de lecture** (par exemple Source Serif 4, Newsreader ou Literata) en poids 600. Cela donne l'allure d'un rapport, contre l'esprit « appli SaaS ».
- **Texte courant et interface : Inter** (déjà utilisé), poids 400/500/600 seulement.
- **Chiffres, scores, identifiants, valeurs techniques : police à chasse fixe** (JetBrains Mono, déjà utilisée), avec `font-variant-numeric: tabular-nums` pour aligner les colonnes.
- Échelle fixe, sans valeurs ad hoc :

| Niveau | Taille | Interligne |
|---|---|---|
| H1 | 36 px (28 px mobile) | 1,15 |
| H2 | 24 px | 1,25 |
| H3 | 18 px | 1,35 |
| Texte | 16–17 px | 1,6 |
| Aide / légende | 14 px | 1,5 |

- Largeur de ligne **60 à 72 caractères** (`max-width: 68ch`) pour tout paragraphe.
- Pas de titre géant en `clamp(32px, 5.5vw, 58px)` : une page de service n'a pas besoin d'un affichage « hero ».
- Pas de `letter-spacing` négatif exagéré, pas de MAJUSCULES espacées sauf petits libellés.

### 3.3 Espacement et formes

- Grille d'espacement de **4 px** : 4, 8, 12, 16, 24, 32, 48, 64.
- **Rayons : 4 px** (champs, boutons, étiquettes), **8 px** maximum pour un bloc. Jamais 24 px+. Jamais de pilule, sauf une étiquette de statut très courte.
- **Ombres : aucune** par défaut. Les blocs se distinguent par un filet de 1 px (`#D9DEEC`). Une ombre légère (`0 1px 2px rgba(30,42,85,.08)`) seulement pour un menu ou une fenêtre qui se superpose.
- Largeur de contenu : 1 colonne de lecture (68ch) ou 12 colonnes, max 1120 px. Marges larges, beaucoup de blanc.

### 3.4 Mouvement

- **Par défaut : aucun.** Seul mouvement admis : changement d'état (survol, focus, ouverture d'un menu) en 120–180 ms, courbe `ease-out` simple.
- Pas de boucle infinie, pas d'animation à l'arrivée sur la page, pas de défilement animé automatique.
- Un indicateur de chargement n'apparaît que pour une attente réelle (audit en cours) et montre une progression vraie.
- `prefers-reduced-motion: reduce` supprime tout le reste.

---

## 4. Composants

### Bouton
- Principal : fond `#3D52A0`, texte blanc, rayon 6 px, hauteur 44 px, poids 600. Survol : fond un ton plus foncé. **Rien d'autre.**
- Secondaire : contour 1 px `#3D52A0`, fond transparent.
- Tertiaire : lien souligné.
- **Un seul bouton principal par écran.**

### Champ de formulaire
- Étiquette **au-dessus**, toujours visible (jamais seulement un texte indicatif).
- Bordure 1 px `#8A94B8`, rayon 4 px, hauteur 44 px.
- Focus : contour 2 px `#3D52A0` (jamais retiré).
- Erreur : message en rouge **sous le champ**, qui dit quoi corriger (« Saisissez une adresse comme nom@domaine.fr »), avec `aria-describedby`.
- Pas d'icône décorative à l'intérieur du champ.

### Bloc d'information
- Pas de carte flottante. Un filet fin au-dessus, un titre H3, un texte. Une liste si ce sont des éléments distincts.
- Pas plus de **2 blocs** côte à côte ; sinon, une liste verticale.

### Tableau de résultats (composant central du produit)
- Colonnes : numéro, contrôle, résultat (texte + symbole, jamais la couleur seule), preuve / détail.
- Alignement à droite des chiffres, police à chasse fixe, lignes séparées par un filet.
- Un contrôle en échec indique **ce qui est mesuré, la valeur observée, la valeur attendue et comment corriger**.

### Score
- Un nombre, une légende (« sur 100 · méthode 2026.1 »), la date. Pas d'anneau animé.
- Le détail par domaine en tableau, pas en huit mini-cartes colorées.
- Toute valeur d'exemple est **étiquetée « Exemple »** de façon visible.

### Étiquette de statut
- Petit rectangle (rayon 4 px) avec texte et symbole : « Réussi », « À corriger », « Critique ». Le texte porte le sens ; la couleur le renforce.

### Navigation
- Barre en haut, fond uni, filet en dessous, liens en texte. Pas de barre flottante en verre.
- Fil d'Ariane sur les pages profondes. Page courante marquée par `aria-current`.
- Menu mobile simple (panneau plein écran ou liste déroulante), sans cascade d'animations.

### Pied de page
- Liens légaux, version de la méthode, contact. Une seule rangée, un seul filet. Pas de bloc de marque volumineux.

---

## 5. Structure des pages

### Règle commune
Chaque page : **titre clair → une phrase qui dit à quoi elle sert → l'action ou le contenu**. Pas de bandeau d'accueil décoratif sur les pages de service.

### Accueil
1. Une phrase qui dit ce que fait Audixio, en clair (« Audixio audite un site web et explique le résultat en français clair »).
2. Un champ « Adresse du site » + un bouton « Lancer l'audit ». C'est l'action principale.
3. Un **vrai rapport d'exemple**, lisible, avec des chiffres réels d'un audit réel, présenté comme un extrait de dossier.
4. Les 8 domaines audités, en liste numérotée, une ligne chacun.
5. « Comment ça marche » en 3 étapes numérotées, texte uniquement.
6. Pas de témoignages inventés, pas de logos clients fictifs.

### Rapport d'audit
- En-tête : site audité, date, version de la méthode, score global.
- Sommaire à gauche (ancre vers chaque domaine), contenu à droite.
- Chaque domaine : un titre numéroté, un score, puis le tableau des contrôles.
- Les actions de correction sont groupées par priorité.
- Pas de graphique si un tableau dit la même chose plus clairement.

### Méthode et barème
- Document de référence : grande lisibilité, sommaire, formules du barème écrites, exemples chiffrés, lien vers la version précédente.

### Sites suivis
- Un tableau : site, dernier audit, score, évolution, prochain contrôle, actions. Tri et filtre simples.

### Tarifs
- Un tableau comparatif sobre (offres en colonnes, fonctions en lignes). Prix en clair, pas de « populaire » mis en avant par un effet.

### Connexion / compte
- Un formulaire court centré, pas d'illustration. Lien « mot de passe oublié », lien d'inscription.

### Demande d'accès au rapport (page analysée)
- Titre : « Demander l'accès au rapport ».
- Une phrase : ce que la demande donne et ce qu'elle ne donne pas.
- Formulaire : e-mail du propriétaire, message (optionnel), bouton « Envoyer la demande ».
- Sous le formulaire : état de la demande (« En attente de réponse du propriétaire »), avec un lien « Actualiser ».
- Un seul texte explicatif (supprimer le doublon), une courte liste « Ce que la demande accorde ».
- Retirer : aperçu flouté avec cadenas, bulles flottantes, dégradé du titre, carte de verre.

### Pages légales
- Texte pur, titres numérotés, date de mise à jour en haut, sommaire cliquable.

### Erreurs et états vides
- Une phrase qui dit ce qui s'est passé et quoi faire ensuite. Pas d'illustration comique.

---

## 6. Rédaction

- **Clair et factuel.** Phrases courtes, vocabulaire du métier expliqué une fois.
- **Chiffres vrais ou rien.** Pas de statistiques inventées, pas de « +10 000 utilisateurs » sans source.
- **Verbes d'action pour les boutons** : « Envoyer la demande », « Lancer l'audit », « Télécharger le rapport ». Jamais « Cliquez ici » ou « En savoir plus » seuls.
- **Pas de superlatifs ni d'adjectifs creux** (« puissant », « révolutionnaire », « intelligent »). On montre un exemple à la place.
- **Pas de tirets cadratins utilisés comme tic** dans les phrases ; une ponctuation normale suffit.
- Chaque message d'erreur dit quoi corriger.
- Les libellés du site restent identiques d'une page à l'autre (un même mot pour une même chose).

---

## 7. Accessibilité (à conserver, c'est la meilleure partie du code actuel)

- Lien d'évitement en tête de page, `lang` correct, un seul `h1`, hiérarchie de titres sans saut.
- Focus toujours visible, ordre de tabulation logique, aucune action réservée à la souris.
- Cible tactile de 44 px minimum.
- Couleur jamais seule porteuse de sens.
- Formulaires : étiquettes liées, erreurs annoncées (`aria-live`), champs obligatoires indiqués en texte.
- Respect de `prefers-reduced-motion` et de la taille de texte du navigateur (unités `rem`).
- Cible : conformité RGAA / WCAG 2.2 AA, vérifiée avec un outil automatique **et** à la main au clavier.

---

## 8. Mise en œuvre technique

1. **Variables CSS uniques** pour couleurs, espacement, rayons, tailles de texte (`:root`), dans un seul fichier partagé par toutes les pages. Aucune valeur de couleur ou de taille écrite en dur dans une page.
2. Supprimer les polices d'icônes Material : utiliser un petit jeu d'icônes SVG intégré, uniquement là où elles aident (état d'un résultat, flèche, fermer).
3. Héberger soi-même les polices (RGPD et vitesse) plutôt que de les charger depuis Google Fonts.
4. Un seul composant pour chaque élément (bouton, champ, tableau, étiquette), pas de copies par page.
5. Vérifier chaque page : sans JavaScript, au clavier, en mobile 360 px, en zoom 200 %, à l'impression.
6. Poids cible : une page de service sous 100 Ko hors images.

---

## 9. Checklist « pas fait par une IA » (à passer sur chaque page)

- [ ] Aucun dégradé de texte ni fond dégradé décoratif
- [ ] Aucune animation en boucle ni à l'arrivée sur la page
- [ ] Aucun flou, verre dépoli, orbe, ombre colorée
- [ ] Rayons ≤ 8 px, aucun bouton en pilule
- [ ] Une seule couleur d'accent ; les couleurs d'état ne servent qu'aux états
- [ ] Pas de grille de 3 cartes « icône + titre + texte »
- [ ] Aucune phrase répétée sur la page
- [ ] Aucun contrôle factice (bouton qui ne fait rien)
- [ ] Aucun chiffre ou témoignage inventé ; exemples étiquetés
- [ ] Titres qui disent quelque chose de précis
- [ ] Le contenu tient sans les effets
- [ ] Contrastes vérifiés, clavier testé, mobile testé

---

## 10. Consigne prête à copier pour Cursor

```
Refais la page <NOM> d'Audixio selon docs/design/REFONTE-DESIGN-SOBRE.md.

Contraintes strictes :
- Style "dossier d'expertise" : fond uni, filets de 1 px, aucune ombre, aucun dégradé,
  aucun flou, aucune animation (sauf survol/focus en 150 ms).
- Une seule couleur d'accent (#3D52A0) ; les couleurs rouge/orange/vert servent
  uniquement à l'état d'un résultat, toujours doublées d'un texte.
- Titres en serif de lecture, texte en Inter, chiffres en police à chasse fixe.
- Rayons 4 px (champs, boutons) et 8 px maximum (blocs). Pas de pilule.
- Variables CSS depuis le fichier partagé, aucune valeur en dur.
- Un seul bouton principal par écran. Aucun contrôle factice.
- Aucun texte inventé : si une donnée est un exemple, la marquer "Exemple".
- Conserver l'accessibilité existante (lien d'évitement, focus visible, aria,
  prefers-reduced-motion) et la tester au clavier.
- Une phrase ne doit apparaître qu'une fois sur la page.

À la fin, passe la checklist de la section 9 et liste ce qui a été supprimé.
```

---

## 11. Ordre de refonte conseillé

1. Fichier partagé de variables, polices et composants (bouton, champ, tableau, étiquette).
2. En-tête et pied de page.
3. Rapport d'audit (c'est le produit).
4. Accueil.
5. Demande d'accès, connexion, compte.
6. Méthode, tarifs, sites suivis.
7. Pages légales et erreurs.
8. Passe finale : checklist de la section 9 sur chaque page, puis audit d'accessibilité.
