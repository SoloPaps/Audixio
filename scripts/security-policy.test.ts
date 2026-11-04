import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy = readFileSync('SECURITY.md', 'utf8');

describe('SECURITY.md (Scorecard SecurityPolicy)', () => {
  it('donne un contact privé et le signalement GitHub', () => {
    expect(policy).toContain('Audixio@outlook.fr');
    expect(policy).toContain('/security/advisories/new');
  });

  it('annonce des délais et une divulgation coordonnée', () => {
    expect(policy).toMatch(/\d+\s+jours/);
    expect(policy).toMatch(/divulgation/i);
    expect(policy).toMatch(/vulnerabilit|vulnérabilit/i);
  });
});
