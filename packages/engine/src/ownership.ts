import type { DohResolver, SafeFetch, SafeResponse } from '@audigy/net';
import { isNetError } from '@audigy/net';
import type { Target } from './types.js';

export const VERIFICATION_METHODS = [
  'dns_txt',
  'file',
  'html_file',
  'meta',
  'well_known',
  'search_console',
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

/** Jeton public : assez long, sans ambiguïté dans un fichier ou une balise. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
/** La preuve doit avoir été revérifiée il y a strictement moins de 10 minutes. */
export const FRESH_MS = 10 * 60 * 1000;
/** Ancien libellé, encore accepté à la lecture. */
export const CHALLENGE_LABEL = 'audigy-site-verification';
export const FILE_NAME = 'audigy-verification.txt';
export const META_NAME = 'audigy-verification';
/** Valeur publiée aujourd’hui : `audixio-verify=<jeton>`. */
export const AUDIXIO_LABEL = 'audixio-verify';
export const AUDIXIO_META_NAME = 'audixio-verification';
export const HTML_FILE_NAME = 'audixio-verification.html';
export const WELL_KNOWN_NAME = '.well-known/audixio-verify.txt';
/** Un fichier de preuve reste court. Une page d’accueil renvoyée à la place est refusée. */
export const PROOF_HTML_MAX_CHARS = 8192;

export interface OwnershipSite {
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export interface ProofRecord {
  status: string;
  method: string;
  lastCheckedAt: Date | null;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export type ActiveRefusal = 'missing' | 'status' | 'stale' | 'scope';

export function generateToken(bytes: Uint8Array = randomTokenBytes()): string {
  const token = base64url(bytes);
  if (!TOKEN_RE.test(token)) throw new Error('token_invalid');
  return token;
}

export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/** `www` est retiré. Les autres sous-domaines restent le nom du site. */
export function dnsDomain(host: string): string {
  const bare = normalizeHost(host);
  return bare.startsWith('www.') ? bare.slice(4) : bare;
}

export function challengeName(host: string): string {
  return `_audigy-challenge.${dnsDomain(host)}`;
}

export function audixioDnsName(host: string): string {
  return `_audixio.${dnsDomain(host)}`;
}

export function challengeValue(token: string): string {
  return `${CHALLENGE_LABEL}=${token}`;
}

export function audixioValue(token: string): string {
  return `${AUDIXIO_LABEL}=${token}`;
}

export function normalizePrefix(
  path: string | null | undefined,
): string | null {
  if (!path || path === '/') return null;
  let value = path.startsWith('/') ? path : `/${path}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

/**
 * DNS TXT et `/.well-known/` couvrent le nom d’hôte.
 * Un fichier ou une balise sur un chemin ne couvre pas le reste du site.
 */
export function scopesMatch(proof: ProofRecord, site: OwnershipSite): boolean {
  if (normalizeHost(proof.host) === '' || normalizeHost(site.host) === '')
    return false;
  if (normalizeHost(proof.host) !== normalizeHost(site.host)) return false;
  if (
    proof.method === 'dns_txt' ||
    proof.method === 'well_known' ||
    proof.method === 'search_console'
  ) {
    return true;
  }
  const proofPath = normalizePrefix(proof.pathPrefix);
  if (proof.scope === 'origin' || proofPath === null) return true;
  if (site.scope !== 'path') return false;
  return proofPath === normalizePrefix(site.pathPrefix);
}

/** Fraîche si l’âge est positif et strictement inférieur à 10 minutes. */
export function isFresh(lastCheckedAt: Date | null, now: Date): boolean {
  if (!lastCheckedAt || Number.isNaN(lastCheckedAt.getTime())) return false;
  const age = now.getTime() - lastCheckedAt.getTime();
  return age >= 0 && age < FRESH_MS;
}

export function activeAllowed(
  proof: ProofRecord | null,
  site: OwnershipSite,
  now: Date,
): { ok: true } | { ok: false; reason: ActiveRefusal } {
  if (!proof) return { ok: false, reason: 'missing' };
  if (proof.status !== 'verified') return { ok: false, reason: 'status' };
  if (!scopesMatch(proof, site)) return { ok: false, reason: 'scope' };
  if (!isFresh(proof.lastCheckedAt, now)) return { ok: false, reason: 'stale' };
  return { ok: true };
}

export function siteFromTarget(target: Target): OwnershipSite {
  return {
    host: target.url.hostname,
    scope: target.scope,
    pathPrefix:
      target.scope === 'path' ? normalizePrefix(target.url.pathname) : null,
  };
}

export function siteBase(site: OwnershipSite): URL {
  const host = normalizeHost(site.host);
  if (site.scope === 'path') {
    const prefix = normalizePrefix(site.pathPrefix) ?? '/';
    return new URL(`https://${host}${prefix}`);
  }
  return new URL(`https://${host}/`);
}

export function originBase(site: OwnershipSite): URL {
  return new URL(`https://${normalizeHost(site.host)}/`);
}

/** Adresse sous la portée. Un `..` est refusé. */
export function scopedUrl(site: OwnershipSite, relative: string): URL {
  const clean = relative.replace(/^\/+/, '');
  if (clean.split('/').includes('..')) throw new Error('path_escape');
  return new URL(clean, siteBase(site));
}

export function verificationFileUrl(site: OwnershipSite): URL {
  return scopedUrl(site, FILE_NAME);
}

export function verificationHtmlUrl(site: OwnershipSite): URL {
  return scopedUrl(site, HTML_FILE_NAME);
}

/** RFC 8615 : `/.well-known/` est à la racine de l’origine, pas sous un préfixe. */
export function wellKnownUrl(site: OwnershipSite): URL {
  return new URL(WELL_KNOWN_NAME, originBase(site));
}

export interface ChallengeView {
  method: VerificationMethod;
  token: string;
  dnsName: string;
  dnsValue: string;
  fileUrl: string;
  htmlFileUrl: string;
  wellKnownUrl: string;
  pageUrl: string;
  metaTag: string;
  /** Search Console : pas de sonde. `later` tant que l’OAuth `siteOwner` n’est pas branché. */
  searchConsole: 'later';
}

export function buildChallenge(
  site: OwnershipSite,
  method: VerificationMethod,
  token: string,
): ChallengeView {
  if (!TOKEN_RE.test(token)) throw new Error('token_invalid');
  const published = audixioValue(token);
  return {
    method,
    token,
    dnsName: audixioDnsName(site.host),
    dnsValue: published,
    fileUrl: verificationFileUrl(site).href,
    htmlFileUrl: verificationHtmlUrl(site).href,
    wellKnownUrl: wellKnownUrl(site).href,
    pageUrl: siteBase(site).href,
    metaTag: `<meta name="${AUDIXIO_META_NAME}" content="${escapeAttr(published)}">`,
    searchConsole: 'later',
  };
}

export type ProbeOutcome = 'present' | 'absent' | 'error';

export async function probeOwnership(
  method: VerificationMethod,
  token: string,
  site: OwnershipSite,
  net: { fetch: SafeFetch; dns: DohResolver },
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  if (!TOKEN_RE.test(token)) return { outcome: 'error', location: '' };
  if (method === 'search_console') {
    return { outcome: 'error', location: 'search_console' };
  }
  if (method === 'dns_txt') return probeDns(token, site, net.dns);
  if (method === 'file') return probeFile(token, site, net.fetch, signal);
  if (method === 'html_file')
    return probeHtmlFile(token, site, net.fetch, signal);
  if (method === 'well_known')
    return probeWellKnown(token, site, net.fetch, signal);
  return probeMeta(token, site, net.fetch, signal);
}

/** Valeur de l’ancienne balise, ou `null` si elle est absente. */
export function metaContent(html: string): string | null {
  return metaByName(html, META_NAME);
}

export function audixioMetaContent(html: string): string | null {
  return metaByName(html, AUDIXIO_META_NAME);
}

export function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 400).trimStart().toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<head') ||
    head.startsWith('<body')
  );
}

function randomTokenBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

function attr(tag: string, key: string): string | null {
  const match = new RegExp(
    `\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    'i',
  ).exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? '';
}

function metaByName(html: string, expected: string): string | null {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const raw = tag[0] ?? '';
    const name = attr(raw, 'name');
    if (name?.toLowerCase() !== expected) continue;
    return attr(raw, 'content');
  }
  return null;
}

function tokenLine(text: string, expected: string): boolean {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .some((line) => line.trim() === expected);
}

async function probeDns(
  token: string,
  site: OwnershipSite,
  dns: DohResolver,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const names = [audixioDnsName(site.host), challengeName(site.host)];
  const expected = new Set([audixioValue(token), challengeValue(token)]);
  let failed = false;
  for (const location of names) {
    try {
      const answer = await dns.query(location, 'TXT');
      if (answer.status !== 0 && answer.status !== 3) {
        failed = true;
        continue;
      }
      const found = answer.records.some(
        (record) => record.type === 'TXT' && expected.has(record.data.trim()),
      );
      if (found) return { outcome: 'present', location };
    } catch (error) {
      if (!isNetError(error)) throw error;
      failed = true;
    }
  }
  return {
    outcome: failed ? 'error' : 'absent',
    location: names[0] ?? '',
  };
}

async function probeFile(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = verificationFileUrl(site);
  return readProof(url, fetch, signal, (res) => fileHasToken(res, token));
}

async function probeHtmlFile(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = verificationHtmlUrl(site);
  return readProof(url, fetch, signal, (res) => htmlFileHasToken(res, token));
}

async function probeWellKnown(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = wellKnownUrl(site);
  return readProof(url, fetch, signal, (res) => wellKnownHasToken(res, token));
}

async function probeMeta(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = siteBase(site);
  return readProof(url, fetch, signal, (res) =>
    metaHasToken(res.text(), token),
  );
}

async function readProof(
  url: URL,
  fetch: SafeFetch,
  signal: AbortSignal | undefined,
  present: (res: SafeResponse) => boolean,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  try {
    const res = await fetch(url, signal ? { signal } : {});
    if (res.status === 404 || res.status === 410) {
      return { outcome: 'absent', location: url.href };
    }
    if (res.status !== 200) return { outcome: 'error', location: url.href };
    return {
      outcome: present(res) ? 'present' : 'absent',
      location: url.href,
    };
  } catch (error) {
    if (isNetError(error)) return { outcome: 'error', location: url.href };
    throw error;
  }
}

function fileHasToken(res: SafeResponse, token: string): boolean {
  const text = res
    .text()
    .replace(/^\uFEFF/, '')
    .trim();
  if (text === token) return true;
  if (looksLikeHtml(text)) return false;
  return tokenLine(text, token);
}

function htmlFileHasToken(res: SafeResponse, token: string): boolean {
  const text = res.text();
  if (text.length > PROOF_HTML_MAX_CHARS) return false;
  if (!looksLikeHtml(text)) return false;
  const published = audixioValue(token);
  if (audixioMetaContent(text) === published) return true;
  if (metaContent(text) === token) return true;
  return tokenLine(text, published) || tokenLine(text, token);
}

function wellKnownHasToken(res: SafeResponse, token: string): boolean {
  const text = res.text();
  if (looksLikeHtml(text)) return false;
  if (text.length > PROOF_HTML_MAX_CHARS) return false;
  const published = audixioValue(token);
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (trimmed === published || trimmed === token) return true;
  return tokenLine(text, published) || tokenLine(text, token);
}

function metaHasToken(html: string, token: string): boolean {
  if (audixioMetaContent(html) === audixioValue(token)) return true;
  return metaContent(html) === token;
}
