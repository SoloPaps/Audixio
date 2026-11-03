import {
  apiDepsFromEnv,
  createLogger,
  handleGuestCreate,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleGuestCreate(
      req,
      apiDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
    ),
  );
};

export const config = { path: '/api/guest-audits', method: 'POST' };
