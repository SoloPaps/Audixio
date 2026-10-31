# Prochaines étapes de développement — Audixio

Mise à jour du 01/11/2026. Source des décisions : [00-DECISIONS.md](../00-DECISIONS.md) (elle prime sur tout autre fichier). Ce fichier ne remplace pas [PLAN.md](PLAN.md) : il dit **quoi faire maintenant**, dans l'ordre.

> Statut : établi à partir des docs ; l'avancement réel du code est à confirmer avant de commencer chaque étape.

## A. Cœur du produit (priorité absolue, en local)
1. Droits côté serveur : matrice statut → droits, filtrage des domaines (voir `MATRICE-STATUT-DROITS-CANON.md`).
2. Soft-gate PARTIEL : domaines entiers « Verrouillé » (Sécurité, Vie privée, DNS/e-mail) sans preuve de propriété.
3. Hub du rapport : note globale A–F, TOP 10 titres, 8 cartes de domaine.
4. Connexion : e-mail + mot de passe, Google, GitHub (plus de lien magique).
5. Preuves de propriété : fichier HTML, balise meta, `.well-known` ; puis DNS TXT et Search Console.
6. Brief et export Markdown de base ; sélection Rien / Vérif / Fix.
7. Vie privée partielle (HTTP/HTML), avec libellés honnêtes.
8. Anti-abus basique : limites d'audits et de liens (gratuit : 2 sites, 1 lien actif).

## B. Sécurité (suite de l'audit du 31/10/2026)
- Fait : INSERT direct sur `audits` retiré ; UPDATE de `sites` limité aux colonnes d'affichage (migration `20261031190000`).
- À faire : relecture du jeton OAuth Google (stockage, révocation), de l'anti-SSRF (`packages/net`), de la limitation de débit, et des colonnes modifiables de `reports`.
- Écarter l'alerte Dependabot minimatch (dev seulement), puis suivre les 71 alertes initiales.
- Épingler les actions GitHub sur leur hash (alertes zizmor) ; corriger `scorecard`.

## C. Design (voir `design/REFONTE-DESIGN-SOBRE.md`)
Ordre : shell (en-tête, pied) → rapport d'audit → accueil → connexion / compte / demande d'accès → méthode, tarifs, sites suivis → pages légales.
- Héberger soi-même les polices (Source Serif 4, Inter, JetBrains Mono).
- Rétablir les ressources manquantes du dossier `design/` : `maquettes/chrome/`, `logos/…/out/`, `assets/` (fichiers binaires à ajouter depuis le poste local).

## D. Tests et lancement
1. Recette locale par le propriétaire sur 1 à 2 de ses sites ([RECETTE.md](RECETTE.md)).
2. Notes de blocage (bugs, textes).
3. Juriste (CGU, mentions, licences) — décision du propriétaire.
4. Bêta publique — décision du propriétaire uniquement.
5. Hébergement payant au lancement (Netlify Personal, Supabase Pro).

## E. Plus tard
Anglais complet et thème sombre complet · Pro (~9 €/mois) et paiements · DNS comme preuve principale · serveur navigateur d'audit (location mensuelle) · OAuth hébergeur.

## Quel modèle utiliser
Règle du projet (PLAN §0) : **Fort** (modèle de pointe, effort élevé) seulement pour les PART marquées « Fort » ; sinon **Éco** (modèle rapide).
- Fort : moteur d'audit, droits serveur et RLS, authentification, anti-SSRF, relecture de sécurité.
- Éco : pages et composants d'interface, textes, tests, documentation, corrections mécaniques.
Une PART = une conversation neuve = une branche = une PR.
