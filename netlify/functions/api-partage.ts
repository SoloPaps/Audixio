import {
  createLogger,
  handlePartage,
  lienDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';
import { renderBriefMarkdown } from '../../apps/web/src/lib/brief-markdown.js';
import { translate } from '../../apps/web/src/lib/translate.js';

const GENERIC = 'Constat relevé sur ce site.';

function titleOf(key: unknown): string {
  if (typeof key !== 'string') return GENERIC;
  const text = translate(key);
  if (!text) return GENERIC;
  const line = text.replace(/\s+/g, ' ').trim().slice(0, 400);
  return line === '' ? GENERIC : line;
}

/** Le journal ne stocke pas le texte. On le reconstruit pour le lecteur équipe. */
function withTeamBrief(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const row = body as {
    access?: unknown;
    brief?: unknown;
    briefTexte?: unknown;
    url?: unknown;
    finishedAt?: unknown;
    constats?: unknown;
  };
  if (row.access !== 'team') return body;
  if (row.brief !== 'partiel' && row.brief !== 'complet') return body;
  if (typeof row.briefTexte === 'string' && row.briefTexte !== '') return body;
  const items: {
    checkId: string;
    title: string;
    proof: string;
    mode: 'fix' | 'verif';
  }[] = [];
  if (Array.isArray(row.constats)) {
    for (const item of row.constats) {
      if (!item || typeof item !== 'object') continue;
      const checkId = (item as { checkId?: unknown }).checkId;
      const status = (item as { status?: unknown }).status;
      if (typeof checkId !== 'string' || checkId === '') continue;
      const title = titleOf((item as { messageKey?: unknown }).messageKey);
      items.push({
        checkId,
        title,
        proof: title,
        mode: status === 'fail' ? 'fix' : 'verif',
      });
    }
  }
  try {
    return {
      ...row,
      briefTexte: renderBriefMarkdown({
        level: row.brief,
        url: typeof row.url === 'string' ? row.url : '',
        at: typeof row.finishedAt === 'string' ? row.finishedAt : null,
        items,
      }),
    };
  } catch {
    return body;
  }
}

/** Lecture d’un lien. Le jeton voyage dans le corps, pas dans l’adresse. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  const response = await serve(logger, async () =>
    handlePartage(req, lienDepsFromEnv({ env: process.env, logger })),
  );
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.includes('json')) return response;
  const body = withTeamBrief(await response.json());
  return new Response(JSON.stringify(body), {
    status: response.status,
    headers: response.headers,
  });
};

export const config = { path: '/api/partage', method: 'POST' };
