import {
  createLogger,
  handlePartage,
  lienDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Lecture d’un lien. Le jeton voyage dans le corps, pas dans l’adresse. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handlePartage(req, lienDepsFromEnv({ env: process.env, logger })),
  );
};

export const config = { path: '/api/partage', method: 'POST' };
