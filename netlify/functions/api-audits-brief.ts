import {
  createLogger,
  handleBriefExport,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';
import { briefDeps, briefLocaleOf } from '../../apps/web/src/lib/brief-deps.js';

export default async (
  req: Request,
  context: { params?: Record<string, string> },
): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    // Langue de l’interface (en-tête du navigateur) : même fichier que l’aperçu.
    handleBriefExport(
      req,
      briefDeps(req.url, logger, briefLocaleOf(req)),
      context.params?.id,
    ),
  );
};

export const config = {
  path: '/api/audits/:id/brief',
  method: ['GET', 'POST'],
};
