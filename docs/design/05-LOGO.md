# Audixio — Logo officiel (validé owner 2026-10-28)


Marque produit : **Audixio**. Assets = détourages owner (alpha propre).
**Ne pas régénérer, recolorer, recadrer serré, ni remplacer par du texte / Material / SVG inventé.**

## Emplacement

```
docs/design/logos/audixio-logos/
  src/   # masters détourés owner
  out/   # exports prêts (transparent PNG + tailles)
```

ZIP miroir : `docs/design/logos/Audixio-logos-pack.zip`.

## Fichiers à utiliser (`out/`)

| Fichier | Rôle |
|---------|------|
| `Audixio_PC_clair_transparent.png` | Lockup complet clair (icône A + wordmark navy) — header / splash **thème light** |
| `Audixio_PC_sombre_transparent.png` | Lockup complet sombre (icône A + wordmark blanc) — header **thème dark** |
| `Audixio_PC_clair_h{32,40,48,64,80,96,128}.png` | Hauteurs prêtes light |
| `Audixio_PC_sombre_h{32,40,48,64,80,96,128}.png` | Hauteurs prêtes dark |
| `Audixio_mark_transparent.png` + `Audixio_mark_{16…512}.png` | Icône A seule (clair), centrée carré |
| `Audixio_mark_sombre_transparent.png` + `Audixio_mark_sombre_{16…512}.png` | Icône A seule (sombre) |
| `Audixio_mobile_clair_*.png` / `Audixio_mobile_sombre_*.png` | Idem mark, tailles mobile |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Favicon / PWA (dérivés mark clair) |

Anciens JPG `assets/logo-icon.jpg` / `logo-lockup.jpg` : **obsolètes** — ne plus les brancher sur le shell.

## Usages Cursor

| Contexte | Asset | Notes |
|----------|-------|-------|
| `AppHeader` desktop light | `Audixio_PC_clair_h40.png` (ou h32–h48) | Lien Accueil ; hauteur ~32–40 px |
| `AppHeader` desktop dark | `Audixio_PC_sombre_h40.png` | Même hauteur |
| Header / drawer mobile | `Audixio_mark_40.png` (ou mobile_clair) | Carré net |
| Favicon / apple-touch / PWA | fichiers `favicon*` / `icon-*` / `apple-touch-icon` | Déjà exportés — ne pas reinventer |
| Empty / loading | mark clair ou sombre selon thème | Opacité douce OK |

Alt : **« Audixio »** (pas « logo » seul).

## Charte couleurs (liée au logo)

- Accent pétrole / teal-cyan du ruban A + accent **pêche** du trait.
- Couleurs du site : charte v6 (`01-REGLES-STRICTES.md`).

## INTERDIT

- Material Symbols type ECG / shield / verified comme marque
- Lettre « A » générique ou wordmark redessiné en CSS à la place du PNG
- Recadrer jusqu’à couper le ruban ou la barre pêche
- Remplir les trous des lettres / triangle du mark
- Utiliser les JPG `assets/logo-*.jpg` pour le chrome
