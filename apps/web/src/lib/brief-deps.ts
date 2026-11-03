import { isLockedDomain } from '@audigy/db';
import {
  type AuditView,
  apiDepsFromEnv,
  type BriefExportDeps,
  type FindingView,
  type Logger,
} from '@audigy/orchestrator';
import { renderBriefMarkdown } from './brief-markdown.js';
import { asParams, translate } from './translate.js';

const GENERIC = 'Constat relevé sur ce site.';

/** Libellé serveur. Un domaine verrouillé ne sort pas son texte. */
export function labelBriefFinding(finding: FindingView): {
  title: string;
  proof: string;
} {
  if (isLockedDomain(finding.domain)) {
    return { title: GENERIC, proof: GENERIC };
  }
  const text = translate(finding.messageKey, asParams(finding.params));
  const line = (text ?? GENERIC).replace(/\s+/g, ' ').trim().slice(0, 400);
  const safe = line === '' ? GENERIC : line;
  return { title: safe, proof: safe };
}

export function briefDeps(requestUrl: string, logger: Logger): BriefExportDeps {
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
    label: labelBriefFinding,
    render: renderBriefMarkdown,
  };
}
