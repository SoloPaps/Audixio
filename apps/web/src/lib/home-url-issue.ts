import { isCompleteHttpUrl } from './site-url.js';

/** Message français si l’adresse d’accueil n’est pas une URL http(s). */
export function homeUrlIssue(raw: string, message: string): string | null {
  if (isCompleteHttpUrl(raw.trim())) return null;
  return message;
}

/** Le champ affiche « https:// » devant : une adresse sans protocole le reçoit. */
export function withScheme(raw: string): string {
  const value = raw.trim();
  if (value === '' || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return `https://${value.replace(/^\/\//, '')}`;
}
