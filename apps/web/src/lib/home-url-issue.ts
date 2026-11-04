import { isCompleteHttpUrl } from './site-url.js';

/** Message français si l’adresse d’accueil n’est pas une URL http(s). */
export function homeUrlIssue(raw: string, message: string): string | null {
  if (isCompleteHttpUrl(raw.trim())) return null;
  return message;
}
