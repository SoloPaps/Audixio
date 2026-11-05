import { isLockedDomain, seesFullReport } from '@audigy/db';
import {
  type AuditView,
  apiDepsFromEnv,
  type BriefExportDeps,
  type FindingView,
  type Logger,
} from '@audigy/orchestrator';
import enDictionary from '../../public/dictionnaire-en.json' with {
  type: 'json',
};
import type { BriefLocale } from '../i18n/brief-fr.js';
import { renderBriefMarkdown } from './brief-markdown.js';
import { asParams, translate } from './translate.js';

const GENERIC = 'Constat relevé sur ce site.';
const GENERIC_EN = 'Finding noted on this site.';
const EN: Readonly<Record<string, string>> = enDictionary;

function englishLine(
  key: string,
  params: Record<string, string | number> | null,
): string | null {
  const template = EN[key];
  if (typeof template !== 'string' || template === '') return null;
  let missing = false;
  const line = template.replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (_raw, name: string) => {
      const value = params?.[name];
      if (typeof value !== 'string' && typeof value !== 'number') {
        missing = true;
        return '';
      }
      return String(value);
    },
  );
  return missing ? null : line;
}

/** Langue demandée par le navigateur pour le fichier du brief. */
export function briefLocaleOf(request: Request): BriefLocale {
  return request.headers.get('x-audigy-locale') === 'en' ? 'en' : 'fr';
}

/**
 * Libellé serveur. Un domaine verrouillé ne sort pas son texte, sauf pour un
 * lecteur qui voit le rapport complet (site vérifié) : `open`.
 */
export function labelBriefFinding(
  finding: FindingView,
  locale: BriefLocale = 'fr',
  open = false,
): {
  title: string;
  proof: string;
} {
  const generic = locale === 'en' ? GENERIC_EN : GENERIC;
  if (!open && isLockedDomain(finding.domain)) {
    return { title: generic, proof: generic };
  }
  const params = asParams(finding.params);
  const text =
    (locale === 'en' ? englishLine(finding.messageKey, params) : null) ??
    translate(finding.messageKey, params);
  const line = (text ?? generic).replace(/\s+/g, ' ').trim().slice(0, 400);
  const safe = line === '' ? generic : line;
  return { title: safe, proof: safe };
}

export function briefDeps(
  requestUrl: string,
  logger: Logger,
  locale: BriefLocale = 'fr',
): BriefExportDeps {
  const api = apiDepsFromEnv({ env: process.env, requestUrl, logger });
  return {
    logger,
    userFromToken: (token) => api.userFromToken(token),
    readAudit: (token, auditId) => api.readAudit(token, auditId),
    viewerFor(view: AuditView) {
      return {
        kind: 'account',
        plan: 'free',
        siteVerified: view.audit.siteVerified === true,
      };
    },
    label: (finding, viewer) =>
      labelBriefFinding(finding, locale, seesFullReport(viewer)),
    render: (input) => renderBriefMarkdown({ ...input, locale }),
  };
}
