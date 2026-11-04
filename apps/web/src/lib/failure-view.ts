import { formatDateTime, t } from '../i18n/index.js';
import type { AuditPayload } from './audit-api.js';

export interface FailureView {
  host: string;
  url: string;
  code: string;
  time: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Site, code et heure de l’audit réel. Jamais les constantes de la maquette. */
export function failureView(payload: AuditPayload): FailureView {
  const url = payload.audit.site.url;
  const raw = payload.audit.finishedAt ?? payload.audit.createdAt;
  const date = new Date(raw);
  const error = payload.audit.error?.trim() ?? '';
  return {
    host: hostOf(url),
    url,
    code: error === '' ? t('failure.unmeasured') : error,
    time: Number.isNaN(date.getTime()) ? '' : formatDateTime(date),
  };
}
