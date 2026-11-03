import { isLockedDomain } from '@audigy/db';
import { t } from '../i18n/index.js';
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
}

function domainOf(checkId: string): string {
  const dot = checkId.indexOf('.');
  return dot === -1 ? checkId : checkId.slice(0, dot);
}

/** Markdown du brief. Les domaines verrouillés restent dehors en mode partiel. */
export function renderBriefMarkdown(input: BriefMarkdownInput): string {
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
          item.mode === 'fix' ? t('brief.act.fix') : t('brief.act.check'),
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
      ? t('brief.export.full')
      : t('brief.export.partial');
  return briefFileBody(`${prefix}\n\n${body}`);
}
