import {
  bearerToken,
  createLogger,
  handleLien,
  lienDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Acceptation ou refus d’un accès équipe. */
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

export const config = { path: '/api/liens/decision', method: 'POST' };
