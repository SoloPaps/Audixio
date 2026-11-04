import { t } from '../i18n/index.js';

/** Conclusion affichée. Un domaine non testé n’en a pas. */
export function hubConclusion(input: {
  locked: boolean;
  score: number | null;
  summary: string;
  detail: string;
}): string | null {
  if (input.locked) return input.detail;
  if (input.score === null) return null;
  return input.summary;
}

export function shownConclusion(level: string, text: string): string | null {
  if (level === 'untested') return null;
  return text;
}

/** Chapeau du domaine : pas de « trois corrections » sans constat à corriger. */
export function domainLede(
  domainId: string,
  level: string,
  fixCount: number,
  sentence: string,
): string | null {
  return shownConclusion(
    level,
    domainId === 'performance' && fixCount > 0
      ? t('domaine.lede.speed')
      : sentence,
  );
}
