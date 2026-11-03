import { accountId, createServiceClient, dbEnvFrom } from '@audigy/db';
import { authEnvFrom, sessionUserId } from '@audigy/db/auth-http';
import type { IntakeDeps, IntakeRecord } from './intake.js';
import { takeRateLimit } from './intake.js';
import type { Logger } from './log.js';

const KEPT_MS = 366 * 24 * 60 * 60 * 1000;

export function intakeDepsFromEnv(
  env: NodeJS.ProcessEnv,
  logger: Logger,
): IntakeDeps {
  const db = dbEnvFrom(env);
  const service = createServiceClient(db);
  const auth = authEnvFrom(env);
  return {
    logger,
    now: () => Date.now(),
    userId(req) {
      return sessionUserId(req, auth).then((id) => accountId(id));
    },
    take(budget, nowMs) {
      return takeRateLimit(
        async (input) => {
          const { data, error } = await service.rpc('consume_rate_limit', {
            p_key: input.key,
            p_window_start: input.windowStart,
            p_limit: input.limit,
          });
          if (error) return false;
          return data === true;
        },
        budget,
        nowMs,
      );
    },
    async record(entry: IntakeRecord) {
      const { error } = await service.from('audit_log').insert({
        action: entry.action,
        actor: entry.actor,
        target: entry.target,
        details: entry.details,
      });
      if (error) throw new Error('intake_store');
      const cutoff = new Date(Date.now() - KEPT_MS).toISOString();
      await service
        .from('audit_log')
        .delete()
        .in('action', ['access_request', 'robot_optout'])
        .lt('at', cutoff);
    },
  };
}
