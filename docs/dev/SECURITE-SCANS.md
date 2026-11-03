# Scans de sécurité

Aucun de ces jobs ne déploie. Ils lisent le dépôt, ou, pour ZAP, une adresse déjà en ligne.

## Snyk

Pas de workflow Snyk dans ce dépôt. Les dépendances sont suivies autrement :

- Dependabot, chaque lundi (`.github/dependabot.yml`) : npm et GitHub Actions.
- `dependency-review` sur les pull requests (`.github/workflows/dependency-review.yml`).
- `pnpm audit` dans `.github/workflows/security.yml` : le job échoue à partir du niveau `high`.

## CodeQL

`.github/workflows/codeql.yml`. À chaque push sur `main`, sur les pull requests, et chaque lundi à 04:23 UTC. Langage JavaScript / TypeScript, règles `security-extended` et `security-and-quality`. Les alertes vont dans l’onglet Security.

## Semgrep

Job `semgrep` de `.github/workflows/security.yml`. Image `semgrep/semgrep`, configs `p/security-audit`, `p/javascript`, `p/typescript`, `p/owasp-top-ten`. Le rapport SARIF est publié dans l’onglet Security. `fixtures` et `pnpm-lock.yaml` sont exclus.

## gitleaks

Job `secrets` du même workflow. Historique git complet. Les motifs sont dans `.gitleaks.toml`.

## ZAP

`.github/workflows/zap-baseline.yml`, action `zaproxy/action-baseline` (scan baseline, passif). Déclenchement : chaque lundi à 05:17 UTC, et à la main (`workflow_dispatch`).

La cible est la variable de dépôt `ZAP_TARGET`. Si elle est vide, le job écrit `scan=false` et s’arrête. Rien n’est scanné, le job reste vert.

Les règles `.zap/rules.tsv` (colonnes séparées par des tabulations) ignorent le bruit déjà connu :

| Règle | Nom | Pourquoi |
|---|---|---|
| 10015 | Cache-Control incomplet | Les fichiers statiques sont mis en cache volontairement. Les réponses d’API portent `Cache-Control: no-store`. |
| 10096 | Timestamp Disclosure | Faux positifs sur les nombres des bundles (versions, hachages). |
| 10109 | Modern Web Application | Information posée sur toute application à fort JavaScript. Pas une faille. |

Le reste reste au niveau choisi par ZAP. `fail_action` est vrai : une alerte non ignorée fait échouer le job. Aucune issue GitHub n’est ouverte par ce scan.

## Nuclei

Pas branché. À ajouter plus tard, sur la même cible que ZAP, sans étape de déploiement.
