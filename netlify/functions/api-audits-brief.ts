import {
  createLogger,
  handleBriefExport,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';
import { briefDeps } from '../../apps/web/src/lib/brief-deps.js';

export default async (
  req: Request,
  context: { params?: Record<string, string> },
): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleBriefExport(req, briefDeps(req.url, logger), context.params?.id),
  );
};

export const config = {
  path: '/api/audits/:id/brief',
  method: ['GET', 'POST'],
};
