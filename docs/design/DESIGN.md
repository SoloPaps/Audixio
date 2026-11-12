# Audixio : charte v6

La charte v6 remplace la fusion MonScore × Arc Soft (palette v2, Inter, Outfit). Le détail est dans [`v6/INTEGRATION-v6.md`](v6/INTEGRATION-v6.md), et les règles à respecter dans [`01-REGLES-STRICTES.md`](01-REGLES-STRICTES.md).

## Couleurs

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#F3F5F8` | `#06090D` |
| Encre | `#0B1220` | voir `theme-dark.css` |
| Faisceau (action, lien) | `#1D5FD1` | `#7CC4FF` |

- Le clair vit dans `tokens.css` (`[data-v6]`).
- Le sombre vit seulement dans `theme-dark.css` (`--d-*`).
- Les lettres A à F gardent leurs couleurs de note, avec la lettre écrite en toutes lettres.

## Typographie

- **Geist** pour le texte, **Geist Mono** pour les URL et les valeurs techniques. Les deux sont auto-hébergées.

## Lecture d'un rapport

- Note en lettre A–F.
- Huit domaines.
- Constats triés par priorité.
- Plan d'action.
- Brief IA.

Les adresses et les onglets sont dans [`v6/STRUCTURE.md`](v6/STRUCTURE.md).

## Poids

- Accueil : moins de 512 000 octets (test e2e `parcours`). Plafond de publication : 700 000 octets (`HOME_MAX_BYTES`, self-audit).
- Aucune requête tierce.
