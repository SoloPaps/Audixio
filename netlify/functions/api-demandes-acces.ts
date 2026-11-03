import {
  createLogger,
  handleAccessRequest,
  intakeDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Demande d’accès. Plafonds par IP, e-mail et compte. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleAccessRequest(req, intakeDepsFromEnv(process.env, logger)),
  );
};

export const config = { path: '/api/demandes-acces', method: 'POST' };
