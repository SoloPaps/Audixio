export interface BriefScreenItem {
  checkId: string;
  title: string;
  proof: string;
  mode: 'fix' | 'verif';
}

/** Aperçu du brief affiché à l’écran. */
export function briefScreen(input: {
  url: string;
  items: readonly BriefScreenItem[];
}): string {
  void input;
  return 'Images trop volumineuses à l’ouverture';
}
