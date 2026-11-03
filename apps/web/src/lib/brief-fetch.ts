import { t } from '../i18n/index.js';
import { saveTextFile } from './report-export.js';
import { translate } from './translate.js';

export interface BriefChoice {
  checkId: string;
  mode: 'fix' | 'verif';
}

const FILE_NAME = /^filename="([A-Za-z0-9._-]{1,80})"$/u;
const MAX_CHARS = 1_000_000;

export type BriefFile =
  | { ok: true; filename: string; markdown: string }
  | { ok: false; message: string };

function messageOf(status: number, body: unknown): string {
  if (status === 401) return t('api.error.unauthorized');
  if (status === 404) return t('api.error.audit_not_found');
  if (!body || typeof body !== 'object') return t('api.error.internal');
  const key = (body as { messageKey?: unknown }).messageKey;
  if (typeof key !== 'string') return t('api.error.internal');
  return translate(key) ?? t('api.error.internal');
}

function filenameOf(header: string | null): string {
  const part = header?.split(';').map((item) => item.trim()) ?? [];
  for (const item of part) {
    const name = FILE_NAME.exec(item)?.[1];
    if (name) return name;
  }
  return 'audixio-prompt-remediation.md';
}

/** Demande le fichier au serveur. Le navigateur n’assemble pas le brief. */
export async function requestBriefExport(
  auditId: string,
  token: string,
  selection: readonly BriefChoice[],
): Promise<BriefFile> {
  let response: Response;
  try {
    response = await fetch(`/api/audits/${encodeURIComponent(auditId)}/brief`, {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        selection: selection.map((item) => ({
          checkId: item.checkId,
          mode: item.mode,
        })),
      }),
    });
  } catch {
    return { ok: false, message: t('api.error.internal') };
  }
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { ok: false, message: messageOf(response.status, body) };
  }
  const markdown = await response.text();
  if (markdown.length > MAX_CHARS) {
    return { ok: false, message: t('api.error.internal') };
  }
  return {
    ok: true,
    filename: filenameOf(response.headers.get('content-disposition')),
    markdown,
  };
}

export function saveBriefExport(filename: string, markdown: string): void {
  saveTextFile(filename, markdown);
}
