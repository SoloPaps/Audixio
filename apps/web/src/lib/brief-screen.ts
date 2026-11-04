import { renderBriefMarkdown } from './brief-markdown.js';

export interface BriefScreenItem {
  checkId: string;
  title: string;
  proof: string;
  mode: 'fix' | 'verif';
}

/** Aperçu du brief : le même prompt que le fichier du site. */
export function briefScreen(input: {
  url: string;
  items: readonly BriefScreenItem[];
  verified?: boolean;
}): string {
  return renderBriefMarkdown({
    level: input.verified === true ? 'complet' : 'partiel',
    url: input.url,
    at: null,
    items: input.items,
  });
}
