# Pages et parcours à confier à Mo (Momentic)

Liste préparée au lot 6b. **Mo n’est pas lancé** : il demande la clé Momentic et
l’accord de l’owner avant chaque passe. Données : uniquement le labo local
(`*.audigy.test`), un compte de test local et des audits invités ; jamais un vrai
compte ni un vrai site client.

Chaque page : FR puis EN (sélecteur de langue), clair puis sombre (bouton thème),
bureau 1440 px puis téléphone 390 px. À chaque fois : aucun texte coupé ni
débordement horizontal, titre h1 lisible, focus visible au clavier, liens et
boutons actifs (le robot `e2e/robot-final.spec.ts` couvre déjà la mécanique,
Mo juge le rendu et le sens).

## Pages publiques

| Page | À regarder en plus |
| --- | --- |
| `/` | formulaire « Scanner mon site » (adresse vide, adresse invalide, adresse valide), animations du héros, menu téléphone |
| `/methode` | sections, dock de sections, formule et échelle |
| `/pro`, `/passer-pro` | tarifs sans prix inventés, boutons d’offre, renvoi `/passer-pro` |
| `/exemple-rapport` | rapport de démonstration, onglets, constats |
| `/accessibilite`, `/ecoconception` | sommaires, ancres, copie d’adresse |
| `/robot`, `/demande-acces` | formulaires, messages d’erreur |
| `/verifier`, `/verifier/00000000-0000-4000-8000-000000000019` | méthodes de preuve, sélecteur de fichier, attente |
| `/score/exemple-score-verifie`, `/partage/<jeton>` | score public, lien de partage, pastille |
| `/cgu`, `/confidentialite`, `/mentions-legales` | sommaire latéral, copie, retour en haut |
| `/cookies` | boîte de dialogue : croix, Échap, « Tout accepter », « Tout refuser », « Personnaliser » puis « Enregistrer mes choix », retour à la page d’origine |
| `/page-inexistante` (404), `/500`, `/maintenance` | boutons de secours, liens utiles |

## Accès

| Page | Parcours |
| --- | --- |
| `/inscription` | mot de passe de 9 caractères refusé, conditions à cocher, envoi |
| `/connexion` | erreur d’identifiants, Google et GitHub visibles, mot de passe oublié |
| `/email-confirme`, `/reinitialisation` | lien expiré, renvoi, nouveau mot de passe |

## Pages connectées (compte de test local)

| Page | Parcours |
| --- | --- |
| `/bienvenue` | premier audit, « Plus tard » |
| `/sites` | liste et état vide, fenêtre Pro à 320 px, ajout d’un site |
| `/sites/<host>` | sections `#audits`, `#historique`, `#verification`, `#partage` |
| `/historique` | journal en cartes à 390 px, export |
| `/compte` | `#profil`, `#alertes`, `#abonnement`, accès partagés, déconnexion |
| `/sites/<host>/demandes/<id>` | accepter, refuser, durée et rôle gardés |

## Parcours de bout en bout

1. Visiteur : accueil → scan d’un site du labo → `/progression` (le bouton « Voir le rapport » n’apparaît qu’à la fin) → `/rapport/<id>` → domaine verrouillé → fenêtre de compte.
2. Inscription → confirmation d’e-mail → `/bienvenue` → premier audit → `/sites`.
3. Connecté : audit → rapport (pastille « partielle · N domaines · site non vérifié ») → domaines → constats → plan → brief → impression.
4. Site injoignable : `/audit-echoue` nomme le site (« L’audit de <site> n’a pas abouti »), « Relancer l’audit » relance le même site.
5. Partage : lien public → `/partage/<jeton>` → retrait du lien.
6. Langue : passer en anglais en cours de progression, la fin reste en anglais ; revenir en français.
7. Cookies : ouvrir `/cookies` depuis le pied de page, personnaliser, enregistrer, retour à la page d’origine.
