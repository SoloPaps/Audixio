/**
 * @audigy/db — client typé et accès Postgres (PLAN §8, §9).
 *
 * API
 * - `createUserClient({ url, anonKey, persistSession? })` : clé anon, RLS.
 *   `persistSession` seulement dans le navigateur (lien magique).
 * - `createServiceClient({ url, serviceRoleKey })` : fonctions et runner.
 *   Jamais dans le navigateur.
 * - `requestMagicLink(client, { email, redirectTo })` : connexion par e-mail,
 *   sans mot de passe. `{ ok: false }` ne contient pas le message du fournisseur.
 * - `claimNextAudit(client)` : RPC `claim_next_audit` (service_role).
 * - `requestAudit(client, input)` : RPC `request_audit` (service_role). Un audit du même
 *   site et du même mode depuis moins de 15 min est renvoyé tel quel (double clic).
 *   Limites : 10 par jour (Europe/Paris) et par utilisateur, 1 par hôte et 15 min.
 * - `writeAuditResults(client, input)` : RPC `write_audit_results` (service_role).
 * - `failStaleAudits(client, minutes)` : audits `running`/`partial` trop vieux → `failed`.
 * - `createUserClient({ …, accessToken })` : client au nom de l'utilisateur (fonctions).
 * - `readReportByShareToken(client, token)` : rapport `link` non révoqué et non expiré.
 * - `readPublicScore(client, slug)` : scores d'un site `is_public`.
 * - `readSharedScore(client, token)` : scores d'un lien encore ouvert. Expiré : `null`.
 * - `dbEnvFrom(env)` : exige `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 *   `SUPABASE_SERVICE_ROLE_KEY`. Aucune valeur dans le dépôt.
 * - `TERMS_VERSION` : version des CGU acceptée dans `terms_acceptances`.
 */

export {
  AUDIT_IP,
  accessBudgets,
  accountId,
  clientIp,
  GUEST_AUDIT,
  guestAuditKey,
  hostOf,
  INTAKE,
  plainText,
  type RateBudget,
  retryAfterSeconds,
  robotBudgets,
  sha256Hex,
} from './abus.js';
export {
  type AuditResultsInput,
  claimNextAudit,
  createServiceClient,
  createUserClient,
  type DbEnv,
  type DomainScoreRow,
  dbEnvFrom,
  type FindingRow,
  failStaleAudits,
  type MagicLinkClient,
  type RequestAuditInput,
  type RequestAuditOutcome,
  type RequestAuditResult,
  readPublicScore,
  readReportByShareToken,
  readSharedScore,
  requestAudit,
  requestMagicLink,
  type UserClientOptions,
  writeAuditResults,
} from './client.js';
export type { Database, Json } from './database.types.js';
export {
  A11Y_MENTION,
  ACCESS_STATUSES,
  ACTION_STATUSES,
  type AccessStatus,
  type ActionStatus,
  type AlertChoice,
  accessStatus,
  type BriefLevel,
  CLIENT_ACTION_STATUSES,
  clampAlerts,
  clientMaySetActionStatus,
  type DomainInput,
  type DomainView,
  defaultAlerts,
  EXTRA_DOMAINS,
  type FindingInput,
  FREE_LINK_CAP,
  FREE_SITE_CAP,
  FREE_SSL_WARN_DAYS,
  GRADE_THRESHOLDS,
  GRADES,
  type Grade,
  gradeForScore,
  isLockedDomain,
  isOpenDomain,
  LOCKED_DOMAINS,
  OPEN_DOMAINS,
  PLANS,
  type Plan,
  PRO_SITE_CAP,
  partialDomainCount,
  partialLabel,
  REAUDIT_CADENCES,
  type ReauditCadence,
  type Rights,
  rightsFor,
  seesFullReport,
  type Viewer,
  visibleDomain,
  visibleFinding,
  visibleGlobalGrade,
  withinLinkQuota,
  withinSiteQuota,
} from './droits.js';
export {
  decisionEquipe,
  expiresAt,
  gateLink,
  type LienFinding,
  type LienRapport,
  type LienVue,
  type LinkGate,
  type LinkKind,
  type LinkRecord,
  lienActif,
  PUBLIC_LINK_DAYS,
  peutCreerLien,
  SHARE_TOKEN,
  shareTokenFromBytes,
  TEAM_DAY_CHOICES,
  vueLien,
} from './liens.js';
export {
  assertLocalSupabase,
  GUEST_AUDIT_LOCAL_LIMIT,
  guestAuditLimit,
  isLocalSupabaseUrl,
} from './local-only.js';
export {
  type PlanChange,
  type PlanItem,
  type PlanMemory,
  type PlanSignal,
  reconcilePlan,
} from './plan-sync.js';
export { TERMS_VERSION } from './terms.js';
export {
  ARTIFACT_KINDS,
  type ArtifactKind,
  AUDIT_MODES,
  AUDIT_STATUSES,
  AUDIT_TRIGGERS,
  type AuditMode,
  type AuditStatus,
  type AuditTrigger,
  DOMAINS,
  type Domain,
  FINDING_STATUSES,
  type FindingStatus,
  HOSTINGS,
  type Hosting,
  REPORT_VISIBILITIES,
  type ReportVisibility,
  SCORE_LEVELS,
  type ScoreLevel,
  SITE_SCOPES,
  type SiteScope,
  VERIFICATION_METHODS,
  VERIFICATION_STATUSES,
  type VerificationMethod,
  type VerificationStatus,
} from './types.js';
