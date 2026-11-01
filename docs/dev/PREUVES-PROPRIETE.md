# Preuves de propriété

Un jeton par site, partagé par toutes les méthodes. Il est créé à la première demande et réutilisé ensuite (`prepare_site_verification`). Le propriétaire relance la détection depuis `/verifier?site=`. Une relecture automatique a lieu chaque jour pour les preuves déjà acceptées, et juste avant un test actif (moins de 10 minutes).

## Méthodes sondées

| Méthode | Où le code est publié | Lecture |
|---|---|---|
| `meta` | Balise `audixio-verification` sur la page d’accueil | `audixio-verify=<jeton>`. L’ancienne balise `audigy-verification` reste acceptée. |
| `html_file` | `audixio-verification.html` à la racine du site (ou du préfixe) | Page HTML courte qui contient la valeur, seule sur une ligne. |
| `well_known` | `https://<hôte>/.well-known/audixio-verify.txt` | Fichier texte. Le chemin est à la racine du nom, pas sous un préfixe. |
| `file` | `audigy-verification.txt` | Déjà en place. Le fichier HTML de preuve est `html_file`. |
| `dns_txt` | `_audixio.<domaine>` | Déjà en place. Valeur `audixio-verify=<jeton>`. L’ancien nom `_audigy-challenge` reste accepté. |

`search_console` est accepté en base et affiché, mais aucune sonde Google n’est lancée. L’OAuth Search Console en lecture `siteOwner` n’est pas branché. Le contrôle répond comme une lecture non concluante.

## Sécurité des sondes

Les lectures HTTP passent par `safeFetch` (`@audigy/net`) : http ou https, ports 80 et 443, pas d’adresse privée, locale ou de métadonnées, DNS vérifié puis IP épinglée, redirections limitées et revérifiées, délai et taille plafonnés.

Chaque clic « Vérifier maintenant » consomme `rate_limits` via `consume_verification_probe` : 10 fois par utilisateur et par heure, 6 fois par hôte et par 15 minutes. La clé est une empreinte, pas le nom en clair.

## Rapport

`read_rapport_apercu` est la lecture du propriétaire. Sans preuve `verified`, la note globale est absente, les domaines Sécurité, Vie privée et DNS n’ont ni lettre ni constat, et l’aperçu ne nomme pas les en-têtes. Le bouton mène à la preuve.

La migration `20261101213000_preuves_note.sql` retire le droit de lire `audits.global_score` et `audits.grade` aux rôles `anon` et `authenticated`. Les migrations plus anciennes ne sont pas modifiées. Rien n’est appliqué sur un projet distant.
