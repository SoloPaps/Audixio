# Références — maquette accueil v3 (11 nov. 2026)

v3 garde la recherche de v2 (tableau du bas) et ajoute ce qui sert le **parcours guidé** et la **copie corrigée**.

## Nouvelles références v3

| # | Référence | Lien | Ce que j'en retiens |
|---|---|---|---|
| 1 | **Pitch.com** — la page d'accueil est une démo qui défile | [Eleken, meilleurs sites SaaS](https://www.eleken.co/blog-posts/best-saas-website-examples) | Raconter le produit **dans l'ordre d'usage** : adresse → audit → note → priorités → prompt → suivi → lien → offres. Chaque panneau montre un vrai écran, pas une illustration. |
| 2 | **Ellipsus** — annotations au stylo sur l'interface | [bestsaaswebdesigns](https://bestsaaswebdesigns.com/site/ellipsus) · [Eleken, exemples](https://www.eleken.co/blog-posts/best-website-design-examples) | Le geste manuscrit rend la page humaine. Chez nous il devient le **stylo rouge du correcteur** : cercles, flèches et commentaires dans la marge (police Caveat). |
| 3 | **Can't Unsee** — jeu « trouvez l'erreur » | [Eleken, bons exemples UX](https://www.eleken.co/blog-posts/good-ux-examples) | Le panneau 03 : une boulangerie imaginaire avec 4 zones à cliquer. Le visiteur trouve les problèmes avant Audixio. Sans JS, tout est déjà visible. |
| 4 | **Hydra** — un objet signature partout (le canard) | [Eleken, exemples](https://www.eleken.co/blog-posts/best-website-design-examples) | Notre objet signature remplace le tampon : **le cercle au stylo rouge**, sur « corrigé », sur la note C, sur le badge, et le tracé rouge de la boussole. |
| 5 | **Section horizontale en CSS pur** (piste épinglée) | [scroll-driven-animations.style](https://scroll-driven-animations.style/demos/horizontal-section/css/) · [codefronts](https://codefronts.com/motion/css-animation-timeline/horizontal-scroll-section-fake-horizontal-scroller/) · [css-animation.com](https://www.css-animation.com/modern-view-transitions-scroll-apis/scroll-driven-animation-patterns/horizontal-scroll-sections-with-scroll-timelines/) | Section haute (`--n × 100vh`) + scène `sticky` + rail `flex` animé par `view-timeline` sur `contain 0% → contain 100%`. Le sens gauche = `row-reverse` et départ décalé. |
| 6 | **Hors fil principal** | [cmdcntr.io](https://cmdcntr.io/blog/learnings/css-horizontal-scroll-animation-off-main-thread) | Animer `translate` seulement (composité), jamais `left`/`width`. Le repli JS ne s'active que si `animation-timeline` manque. |
| 7 | **Support 2026** | [nowyoucanuse](https://nowyoucanuse.com/features--scroll-driven-animations.html) | Scroll-driven animations Baseline (Chrome, Safari 26, Firefox 159) ; `timeline-scope` permet à la boussole (hors des sections) de lire 5 timelines. |
| 8 | **Le cahier Seyès** (culture scolaire française) | — | Repère immédiat pour un public français : grands carreaux, marge rose, encre bleue, rouge du prof. C'est l'identité qu'aucun SaaS n'a. |

## Références v2 conservées

| # | Référence | Lien | Ce qui reste utile en v3 |
|---|---|---|---|
| 9 | Lando Norris (Awwwards SOTY 2025) | [landonorris.com](https://landonorris.com/) | Un objet personnel comme fil rouge (ici le cercle). |
| 10 | Dropbox Brand (CSSDA WOTY 2025) | [brand.dropbox.com](https://brand.dropbox.com/) | Exposer la méthode : le barème est affiché tel quel. |
| 11 | Linear 2026 | [teardown](https://www.yoursaasgrowth.com/cro-teardowns/linear) | « La page est le produit » : vrais écrans dans chaque panneau. |
| 12 | Stripe 2026 | [analyse](https://yugraphik.com/en/blog/web-design/web-redesigns-2026-big-brands/) | Un seul système d'emphase : le rouge correcteur. |
| 13 | CSS natif : view transitions, `@property` | [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) | Bascule de thème en view transition ; `@property --s1…--s5` pour additionner les progressions. |

Écartés (demande owner) : néon sombre générique, 3D, collage maximaliste.
