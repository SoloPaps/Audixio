/** Domaine affiché pendant l’analyse. */
export function hostFromProgressQuery(search: string): string | null {
  void search;
  return 'atelier-martin.fr';
}

/** Lien « Voir le rapport » de la progression. */
export function reportHrefFromSearch(search: string): string {
  void search;
  return '/rapport';
}
