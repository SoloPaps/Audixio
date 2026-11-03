import {
  bearerToken,
  createLogger,
  handleLien,
  lienDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Création, liste et révocation des liens de partage. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleLien(
      req,
      lienDepsFromEnv({
        env: process.env,
        logger,
        accessToken: bearerToken(req),
      }),
    ),
  );
};

export const config = {
  path: '/api/liens',
  method: ['GET', 'POST', 'DELETE'],
};
