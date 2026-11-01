# Nav / AppHeader canon (owner 2026-10-28)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../../../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.

> **30/10/2026** — l'item « Documentation » est remplacé par **« Tarifs »** (desktop, menu mobile) ; il mène à la **page Pro** `finales/page_pro/page_pro.html` (comparatif Gratuit/Pro + liste d'attente) ; la popup `interface_passer_pro` ne s'ouvre que lorsqu'une limite est atteinte. Voir `00-DECISIONS.md` (30 octobre).

## Desktop

**Référence layout :** [`assets/chrome-header-canon-light.png`](chrome-header-canon-light.png)

### Forme (obligatoire)

- Pas un bandeau pleine largeur collé aux bords.
- **Barre flottante encadrée** (fond clair, coins arrondis, bordure fine / ombre) autour de tout le header.
- Trois zones dans l’encadré :
  1. **Gauche** — lockup logo
  2. **Milieu** — Accueil · Méthode · Sites suivis · Tarifs (au centre)
  3. **Droite** — FR|EN · thème · Connexion (ou Compte)

**Logo fichiers :** `logos/audixio-logos/out/` — `Audixio_PC_clair_h*.png` / `Audixio_PC_sombre_h*.png`.

| Zone | Contenu gelé |
|------|----------------|
| Encadré | Flottant, coins arrondis, bordure ; pas edge-to-edge |
| Gauche | Lockup PC clair/sombre `out/` |
| Milieu | **Accueil · Méthode · Sites suivis · Tarifs** ; item actif = pilule teal |
| Droite | **FR \| EN** · icône thème · **Connexion** (icône login) **ou Compte** si session |

---

## Mobile (owner 2026-10-28)

Deux bandes distinctes + flèche remonter. **Pas** de drawer hamburger pour la nav principale (les 4 destinations = bottom sticky).

### 1. Haut de page (chrome utilitaire)

**Réf. :** [`assets/chrome-mobile-top-bar.png`](chrome-mobile-top-bar.png)

- Sticky / fixe en haut (même esprit encadré / coins arrondis que le desktop).
- **Gauche :** logo (lockup mobile ou mark + Audixio) = `out/` (`Audixio_mobile_clair_*` / mark / PC selon densité).
- **Droite :** FR|EN · thème · Connexion (icône login) **ou Compte** si session.
- **Pas** les 4 liens texte Accueil…Tarifs dans le top mobile (ils sont en bas).

### 2. Bas d’écran (nav principale sticky)

**Réf. :** [`assets/chrome-mobile-bottom-nav.png`](chrome-mobile-bottom-nav.png)

- **Sticky** en bas de l’écran (safe-area iOS).
- Quatre items, icônes line-art + libellé :
  1. **Accueil** — maison
  2. **Méthode** — bouclier / check
  3. **Sites suivis** — courbe + loupe
  4. **Tarifs** — étiquette prix ; mène à `finales/page_pro/` (popup `interface_passer_pro` = limite atteinte uniquement)
- Item actif : fond pilule `#EDE8F5` + texte `#3D52A0` (palette v2) + **point** sous le libellé (comme le PNG).
- Items inactifs : gris.
- Même ordre et mêmes destinations que le milieu desktop.
- **Ce n’est pas** l’ancienne bottom-bar interdite `Diagnostic · Méthode · Sites · Compte`.

### 3. Flèche remonter (mobile only)

**Réf. style :** [`assets/chrome-mobile-back-to-top.png`](chrome-mobile-back-to-top.png)

- Bouton **sticky** : carré coins très arrondis (squircle), fond blanc, bordure / ombre légère, **flèche haut** noire centrée.
- Visible après scroll (seuil ~1 viewport) ; masqué en haut de page.
- Au tap : scroll doux vers le haut (`prefers-reduced-motion` → instantané).
- Placement : coin **bas-droit**, **au-dessus** de la bottom nav sticky (ne pas masquer les 4 items ; safe-area).
- Mobile only (pas desktop sauf décision owner).
- `aria-label` : « Remonter en haut » (i18n).

## Règles communes

- Un seul chrome partagé (composants `AppHeader` desktop / `MobileTopBar` + `MobileBottomNav` + `BackToTop`).
- Défaut non connecté → **Connexion**.
- Remplacer headers/footers Stitch par ce chrome.
- Structure ≈ PNG ; **assets logo** = `out/` uniquement.

Voir : `01-REGLES-STRICTES.md`, `workflow-Cursor-shell-pages-motion.md`, `05-LOGO.md`, `etapes-refonte/02-chrome-ui.md`.

## Footer

Compact : [`FOOTER-CANON-compact.md`](FOOTER-CANON-compact.md) + [`assets/chrome-footer-canon-light.png`](chrome-footer-canon-light.png).
