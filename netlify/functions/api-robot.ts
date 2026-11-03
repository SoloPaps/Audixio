import {
  createLogger,
  handleRobotOptOut,
  intakeDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Formulaire d’exclusion du robot. Plafonds par IP, e-mail, domaine et compte. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleRobotOptOut(req, intakeDepsFromEnv(process.env, logger)),
  );
};

export const config = { path: '/api/robot', method: 'POST' };
