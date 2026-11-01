# Connexion — réglages à faire à la main

Le site se connecte avec **e-mail et mot de passe** (principal), **Google** et **GitHub**.
Le lien magique n’est pas proposé. Aucun secret ne va dans le dépôt.
Ne pas lancer `supabase link`, `db push` ni un déploiement Netlify.

Projet Supabase : `pzholfyjwanmkkfggsfe`. Site public : `https://audixio.fr`.

## 1. Google Cloud (fournisseur Google)

1. Ouvrir [Google Cloud Console](https://console.cloud.google.com/) → API et services → Identifiants.
2. Créer un **ID client OAuth** de type « Application Web ».
3. Origine JavaScript autorisée : `https://audixio.fr`.
4. URI de redirection autorisée (une seule, celle de Supabase) :
   `https://pzholfyjwanmkkfggsfe.supabase.co/auth/v1/callback`
5. Pour les essais sur votre machine, ajouter aussi :
   `http://127.0.0.1:54321/auth/v1/callback`
6. Noter l’identifiant client et le secret. Les coller seulement dans Supabase (étape 3), jamais dans git.

## 2. GitHub (fournisseur GitHub)

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL : `https://audixio.fr`.
3. Authorization callback URL :
   `https://pzholfyjwanmkkfggsfe.supabase.co/auth/v1/callback`
4. Pour le Supabase local, créer une seconde application dont le callback est :
   `http://127.0.0.1:54321/auth/v1/callback`
5. Noter le Client ID et générer un Client secret. Même règle : Supabase seulement.

## 3. Supabase (tableau de bord du projet)

Authentication → URL configuration :

- Site URL : `https://audixio.fr`
- Redirect URLs (une ligne chacune) :
  - `https://audixio.fr/api/auth/callback`
  - `http://127.0.0.1:4321/api/auth/callback`
  - `http://localhost:4321/api/auth/callback`
  - `http://127.0.0.1:8888/api/auth/callback`
  - `http://localhost:8888/api/auth/callback`

Authentication → Providers → Email :

- Activer l’e-mail.
- Activer « Confirm email ».
- Durée du code (OTP expiry) : **86400** secondes (24 heures).
- Mot de passe minimum : **10** caractères.
- Ne pas proposer le lien magique dans l’interface. Le fournisseur e-mail peut rester allumé : le site ne l’appelle pas pour se connecter.

Authentication → Providers → Google : activer, coller l’identifiant et le secret de l’étape 1.

Authentication → Providers → GitHub : activer, coller l’identifiant et le secret de l’étape 2.

Les modèles d’e-mail du dépôt (`supabase/templates/confirmation.html` et `recovery.html`) servent en local. Sur le projet distant, copier le même lien : `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup` (et `type=recovery` pour le mot de passe). Sans cette forme, le lien ne pose pas le cookie httpOnly.

## 4. Variables (noms seulement)

Côté Netlify (ou `.env` local, fichier ignoré par git) :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (serveur seulement, jamais dans le navigateur)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`

En local, Google et GitHub sont **éteints** dans `supabase/config.toml` (`enabled = false`) pour que `supabase start` n’exige pas de secret. Pour les essayer sur la machine : passer `enabled` à `true` et remplir `client_id` / `secret` avec `env(GOOGLE_OAUTH_CLIENT_ID)` et `env(GOOGLE_OAUTH_CLIENT_SECRET)` (idem GitHub), puis relancer `supabase start`. Ne pas committer les valeurs.

## 5. Ce que fait le site

- Inscription e-mail : message de confirmation, lien 24 h, page « Adresse e-mail confirmée ».
- Inscription Google ou GitHub : page « Bienvenue » une seule fois (`profiles.onboarding_vu`). « Plus tard » va aux sites suivis. La checklist reste dans le compte.
- Mot de passe oublié, déconnexion, cookies httpOnly (`@supabase/ssr`).
- Pages `/sites`, `/compte` et `/bienvenue` : refus sans session (fonction edge `auth-guard` en production, même contrôle en `astro dev` quand la clé anon n’est pas celle des tests).
- Limite de tentatives sur connexion, inscription et réinitialisation (table `rate_limits`). Les messages ne disent pas si l’adresse existe.
