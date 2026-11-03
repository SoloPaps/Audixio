/**
 * Plafonds anti-abus, sans réseau.
 * Une personne qui réessaie quelques fois passe.
 * Un envoi en rafale, non.
 * L’adresse IP n’est jamais stockée en clair : seulement une empreinte.
 */

export interface RateBudget {
  scope: string;
  material: string;
  limit: number;
  windowMs: number;
}

/** Lancement d’audit : 60 / h / IP. Le compte reste à 10 / jour (SQL). */
export const AUDIT_IP = { limit: 60, windowMs: 60 * 60 * 1000 } as const;

/**
 * Formulaires publics.
 * Compte = e-mail, et identifiant si une session est là.
 * Robot : aussi par domaine, sur 24 h.
 */
export const INTAKE = {
  access: {
    ip: { limit: 30, windowMs: 60 * 60 * 1000 },
    account: { limit: 8, windowMs: 60 * 60 * 1000 },
  },
  robot: {
    ip: { limit: 30, windowMs: 60 * 60 * 1000 },
    account: { limit: 8, windowMs: 60 * 60 * 1000 },
    domain: { limit: 8, windowMs: 24 * 60 * 60 * 1000 },
  },
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clientIp(request: Request): string {
  const netlify = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (netlify) return netlify.slice(0, 64);
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first && first.length > 0) return first.slice(0, 64);
  return 'local';
}

export function retryAfterSeconds(nowMs: number, windowMs: number): number {
  const start = Math.floor(nowMs / windowMs) * windowMs;
  return Math.max(1, Math.ceil((start + windowMs - nowMs) / 1000));
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function accountId(value: string | null): string | null {
  if (!value || !UUID.test(value)) return null;
  return value.toLowerCase();
}

/** Nom d’hôte public. Refuse une adresse vide, locale, ou sans point. */
export function hostOf(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (text.length === 0 || text.length > 253) return null;
  let host = text;
  try {
    host = new URL(text.includes('://') ? text : `https://${text}`).hostname;
  } catch {
    return null;
  }
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!/^[a-z0-9.-]+$/u.test(host)) return null;
  if (host.startsWith('.') || host.includes('..') || !host.includes('.')) {
    return null;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host)) return null;
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.localhost')
  ) {
    return null;
  }
  return host;
}

export function plainText(value: string, max: number): string {
  let cleaned = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) cleaned += char;
  }
  return cleaned.trim().slice(0, max);
}

export function accessBudgets(input: {
  ip: string;
  email: string;
  userId: string | null;
}): RateBudget[] {
  const rows: RateBudget[] = [
    {
      scope: 'access-ip',
      material: input.ip,
      limit: INTAKE.access.ip.limit,
      windowMs: INTAKE.access.ip.windowMs,
    },
    {
      scope: 'access-mail',
      material: input.email,
      limit: INTAKE.access.account.limit,
      windowMs: INTAKE.access.account.windowMs,
    },
  ];
  const userId = accountId(input.userId);
  if (userId) {
    rows.push({
      scope: 'access-user',
      material: userId,
      limit: INTAKE.access.account.limit,
      windowMs: INTAKE.access.account.windowMs,
    });
  }
  return rows;
}

export function robotBudgets(input: {
  ip: string;
  email: string;
  domain: string;
  userId: string | null;
}): RateBudget[] {
  const rows: RateBudget[] = [
    {
      scope: 'robot-ip',
      material: input.ip,
      limit: INTAKE.robot.ip.limit,
      windowMs: INTAKE.robot.ip.windowMs,
    },
    {
      scope: 'robot-mail',
      material: input.email,
      limit: INTAKE.robot.account.limit,
      windowMs: INTAKE.robot.account.windowMs,
    },
    {
      scope: 'robot-domain',
      material: input.domain,
      limit: INTAKE.robot.domain.limit,
      windowMs: INTAKE.robot.domain.windowMs,
    },
  ];
  const userId = accountId(input.userId);
  if (userId) {
    rows.push({
      scope: 'robot-user',
      material: userId,
      limit: INTAKE.robot.account.limit,
      windowMs: INTAKE.robot.account.windowMs,
    });
  }
  return rows;
}
