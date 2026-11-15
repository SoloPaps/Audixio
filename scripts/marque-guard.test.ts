import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// L'ancienne marque s'écrit en deux morceaux pour ne pas se détecter elle-même.
const OLD = new RegExp(['aud', 'igy'].join(''), 'i');

// Usages légitimes : libellés de preuve de propriété encore acceptés en
// lecture, fixture signée (user-agent figé dans l'empreinte), tests de ces
// libellés, documentation de ce protocole et archives.
const ALLOWED = [
  /^docs\/archive\//,
  /^docs\/dev\/(PLAN|PREUVES-PROPRIETE)\.md$/,
  /^docs\/etapes\/00-LISEZ-MOI\.md$/,
  /^packages\/engine\/src\/ownership\.ts$/,
  /^packages\/engine\/test\/ownership\.test\.ts$/,
  /^packages\/evidence\/fixtures\/results\.json$/,
  /^packages\/net\/test\/doh\.test\.ts$/,
  /^packages\/orchestrator\/test\/verify\.test\.ts$/,
  /^apps\/web\/src\/lib\/verify-(challenge|guides\.test)\.ts$/,
  /^apps\/web\/src\/i18n\/marque\.test\.ts$/,
  /^apps\/web\/e2e\/verifier\.spec\.ts$/,
];

const listing = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
const tracked = listing.split('\0').filter(Boolean);

const isAllowed = (file: string) => ALLOWED.some((rule) => rule.test(file));

function hasLegacyName(file: string): boolean {
  if (OLD.test(file)) return true;
  const bytes = readFileSync(file);
  return !bytes.includes(0) && OLD.test(bytes.toString('utf8'));
}

describe('marque : plus d’ancien nom hors usages légitimes', () => {
  it('ne laisse l’ancien nom que dans la liste autorisée', () => {
    const found = tracked.filter((f) => !isAllowed(f) && hasLegacyName(f));
    expect(found).toEqual([]);
  });
});
