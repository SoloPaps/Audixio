import { type MessageKey, t } from '../i18n/index.js';
import { domainSentence } from './domains.js';
import { levelForScore } from './score.js';

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

const SUM: Record<string, MessageKey> = {
  performance: 'hub.sum.performance',
  seo: 'hub.sum.seo',
  securite: 'hub.sum.securite',
  ecologie: 'hub.sum.ecologie',
  accessibilite: 'hub.sum.accessibilite',
  qualite: 'hub.sum.qualite',
  dns_email: 'hub.sum.dns_email',
};

/** Résumé court d’un domaine sur le hub du rapport. */
export function hubSummary(id: string, score: number | null): string | null {
  // #104 : la vie privée suit son vrai niveau, pas un texte « non analysé ».
  if (id === 'vie_privee') return domainSentence(id, levelForScore(score));
  const key = SUM[id];
  return key ? t(key) : null;
}
