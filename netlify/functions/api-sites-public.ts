import {
  bearerToken,
  createLogger,
  handleSitePublic,
  lienDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Publication ou retrait du score public, soumis au même quota que /api/liens. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleSitePublic(
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
  path: '/api/sites/public',
  method: ['POST'],
};
