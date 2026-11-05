import { isLockedDomain } from '@audigy/db';
import { briefServerEn } from '../i18n/brief-en.js';
import {
  type BriefLocale,
  briefLocale,
  withBriefLocale,
} from '../i18n/brief-fr.js';
import { t as common } from '../i18n/index.js';
import { renderBrief, type TerminalMode } from './brief.js';
import { briefFileBody } from './brief-file.js';

export interface BriefMarkdownItem {
  checkId: string;
  title: string;
  proof: string;
  mode: 'fix' | 'verif';
}

export interface BriefMarkdownInput {
  level: 'partiel' | 'complet';
  url: string;
  at: string | null;
  items: readonly BriefMarkdownItem[];
  /** Absente : la langue du navigateur, sinon le français. */
  locale?: BriefLocale;
}

type ServerKey = keyof typeof briefServerEn;

function label(locale: BriefLocale, key: ServerKey): string {
  return locale === 'en' ? briefServerEn[key] : common(key);
}

function domainOf(checkId: string): string {
  const dot = checkId.indexOf('.');
  return dot === -1 ? checkId : checkId.slice(0, dot);
}

/** Markdown du brief. Les domaines verrouillés restent dehors en mode partiel. */
export function renderBriefMarkdown(input: BriefMarkdownInput): string {
  const locale = input.locale ?? briefLocale();
  return withBriefLocale(locale, () => renderIn(locale, input));
}

function renderIn(locale: BriefLocale, input: BriefMarkdownInput): string {
  const findings = input.items.flatMap((item) => {
    if (input.level !== 'complet' && isLockedDomain(domainOf(item.checkId))) {
      return [];
    }
    const terminal: TerminalMode = item.mode === 'fix' ? 'fix' : 'verif';
    return [
      {
        id: item.checkId,
        checkId: item.checkId,
        title: item.title,
        statusLabel:
          item.mode === 'fix'
            ? label(locale, 'brief.act.fix')
            : label(locale, 'brief.act.check'),
        proof: item.proof,
        impact: null,
        terminal,
      },
    ];
  });
  const at = input.at === null ? null : new Date(input.at);
  const stamp = at !== null && !Number.isNaN(at.getTime()) ? at : null;
  const body = renderBrief({
    url: input.url,
    at: stamp,
    stack: null,
    findings,
    catalog: new Map(),
    sources: new Map(),
    includeTerminal: findings.some((item) => item.terminal === 'fix'),
  });
  const prefix =
    input.level === 'complet'
      ? label(locale, 'brief.export.full')
      : label(locale, 'brief.export.partial');
  return briefFileBody(`${prefix}\n\n${body}`);
}
