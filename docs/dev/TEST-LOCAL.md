# Comptes de test locaux

`pnpm lab` crée ces comptes dans le Supabase **local** seulement (Docker, URL `127.0.0.1`, `localhost` ou `::1`). Il affiche les identifiants dans le terminal. Les clés Supabase ne sont pas affichées.

| Compte | E-mail | Mot de passe | Contenu |
|---|---|---|---|
| Gratuit | `gratuit@localhost` | `Audixio-local-gratuit` | Plan gratuit, aucun site |
| Pro | `pro@localhost` | `Audixio-local-pro` | Plan Pro, site `https://bon.audigy.test` déjà vérifié, trois audits (21 jours, 10 jours, 1 jour) |

Connexion : e-mail et mot de passe sur `/connexion`, avec `netlify dev` ou l’app locale branchée sur ce Supabase.

## Plafond des 3 audits sans compte

`pnpm lab` ajoute `AUDIGY_GUEST_UNLIMITED=1` dans le `.env` local. Le serveur n’en tient compte que si `SUPABASE_URL` est locale. Le plafond passe alors à 1000 audits par 24 h : la fonction SQL `consume_rate_limit` refuse un nombre plus grand et répondrait 429 à chaque fois. Sinon la limite reste 3 audits par 24 h. Une URL distante retire aussi la ligne du `.env` si `pnpm lab` voit un Supabase qui n’est pas local.

Hors de la machine, le seed refuse avant toute requête (`hors_local`). Aucune migration de production : ce sont des lignes dans la base Docker.

Si le Supabase local n’est pas démarré (`supabase start`), `pnpm lab` le dit et ne crée rien. Relancer `pnpm lab` est sans danger : les comptes sont mis à jour, pas doublés.

Une base locale encore sur un ancien préfixe de migration : `supabase db reset --local` seulement. Jamais sur le projet distant.
