#!/usr/bin/env node
/**
 * Recopie les extracteurs de retire.js (Apache-2.0) dans packages/engine/data/retire/.
 * Usage : node scripts/update-retire-signatures.ts [commit]
 * Seuls les extracteurs sont gardés : les failles viennent d’OSV, pas de retire.js.
 * Jamais lancé en CI : les tests lisent la copie versionnée.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileCommande } from './commande.mjs';

const REPO = 'RetireJS/retire.js';
const DEFAULT_COMMIT = 'e5e228659bbcaea7ba85536a2ef8d4fb97b366e9';
const OUT = path.join('packages', 'engine', 'data', 'retire');
const KEPT = [
  'uri',
  'filename',
  'filecontent',
  'filecontentreplace',
  'hashes',
] as const;
const SKIPPED = new Set(['retire-example', 'dont check']);

interface RetireLibrary {
  extractors?: Record<string, unknown>;
}

const NAME = /^(?!.*\.\.)[\w@][\w.@/-]{0,79}$/;
const HASH = /^[0-9a-f]{32,128}$/;
const MAX_PATTERN = 2000;
const MAX_TEXT = 100_000;

function fail(why: string): never {
  throw new Error(`contenu retire.js refusé : ${why}`);
}

/** Texte téléchargé (licence, notice) : taille bornée, aucun caractère de contrôle. */
export function checkedText(text: string, file: string): string {
  if (text.length > MAX_TEXT) fail(`${file} trop long`);
  // biome-ignore lint/suspicious/noControlCharactersInRegex: on refuse justement ces caractères.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))
    fail(`${file} contient des caractères de contrôle`);
  return text;
}

function patterns(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) fail(`${where} n’est pas une liste`);
  for (const item of value)
    if (typeof item !== 'string' || item.length > MAX_PATTERN)
      fail(`${where} : motif invalide`);
  return value as string[];
}

function hashes(value: unknown, where: string): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${where} n’est pas un objet`);
  for (const [hash, version] of Object.entries(value))
    if (!HASH.test(hash) || typeof version !== 'string' || version.length > 40)
      fail(`${where} : empreinte invalide`);
  return value as Record<string, string>;
}

/** Ne garde que les extracteurs, après en avoir validé la forme : rien d’autre n’est écrit. */
export function keptLibraries(
  repository: string,
): Record<string, Record<string, unknown>> {
  const source: unknown = JSON.parse(repository);
  if (!source || typeof source !== 'object' || Array.isArray(source))
    fail('la racine n’est pas un objet');
  const libraries: Record<string, Record<string, unknown>> = {};
  for (const name of Object.keys(source).sort()) {
    if (SKIPPED.has(name)) continue;
    if (!NAME.test(name))
      fail(`nom de bibliothèque ${JSON.stringify(name.slice(0, 40))}`);
    const extractors =
      (source as Record<string, RetireLibrary>)[name]?.extractors ?? {};
    const kept: Record<string, unknown> = {};
    for (const kind of KEPT) {
      const value = extractors[kind];
      if (value === undefined) continue;
      const where = `${name}.${kind}`;
      if (kind === 'hashes') {
        const checked = hashes(value, where);
        if (Object.keys(checked).length > 0) kept[kind] = checked;
      } else {
        const checked = patterns(value, where);
        if (checked.length > 0) kept[kind] = checked;
      }
    }
    if (Object.keys(kept).length > 0) libraries[name] = kept;
  }
  return libraries;
}

async function download(commit: string, file: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file} : HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const commit = process.argv[2] ?? DEFAULT_COMMIT;
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('commit invalide');
  const [repository, license, notice] = await Promise.all([
    download(commit, 'repository/jsrepository-master.json'),
    download(commit, 'LICENSE.md'),
    download(commit, 'NOTICE.md'),
  ]);
  checkedText(license, 'LICENSE.md');
  checkedText(notice, 'NOTICE.md');
  if (!license.includes('Apache License') || !license.includes('2.0')) {
    throw new Error('licence inattendue : vérifiez avant de copier');
  }
  const libraries = keptLibraries(repository);
  const data = {
    source: `https://github.com/${REPO}/blob/${commit}/repository/jsrepository-master.json`,
    commit,
    license: 'Apache-2.0',
    copyright: 'Copyright 2018 Erlend Oftedal',
    changes:
      'Modifié par Audigy : extracteurs uri, filename, filecontent, filecontentreplace et hashes seulement. Failles, licences et extracteurs func retirés.',
    libraries,
  };
  await mkdir(OUT, { recursive: true });
  const target = path.join(OUT, 'signatures.json');
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(path.join(OUT, 'LICENSE.md'), license);
  await writeFile(
    path.join(OUT, 'NOTICE.md'),
    `${notice.trimEnd()}\n\n---\n\nsignatures.json est dérivé de repository/jsrepository-master.json\n(${REPO}, commit ${commit}). Audigy n’en garde que les extracteurs.\n`,
  );
  execFileCommande('pnpm', ['exec', 'biome', 'format', '--write', target], {
    stdio: 'inherit',
  });
  console.log(`${Object.keys(libraries).length} bibliothèques → ${target}`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
