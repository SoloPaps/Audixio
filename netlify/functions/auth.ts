import { authEnvFrom, handleAuthRequest } from '@audigy/db/auth-http';

/** Connexion, inscription, réinitialisation, rappel OAuth. Cookies httpOnly. */
export default async function handler(req: Request): Promise<Response> {
  return handleAuthRequest(req, authEnvFrom(process.env));
}

export const config = {
  path: '/api/auth/*',
  method: ['GET', 'POST'],
};
