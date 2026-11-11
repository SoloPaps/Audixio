import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function text(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('charte v6', () => {
  it('remplace la palette v2 et Inter pour le chrome neuf', () => {
    const rules = text('docs/design/01-REGLES-STRICTES.md');
    const design = text('docs/design/DESIGN.md');
    const cursor = text('.cursor/rules/design.mdc');
    expect(rules).toContain('Geist');
    expect(rules).toContain('#1D5FD1');
    expect(rules).not.toContain('Police UI : **Inter**');
    expect(design).toContain('Geist');
    expect(design).toContain('#1D5FD1');
    expect(design).toContain('#06090D');
    expect(cursor).toContain('Geist');
    expect(cursor).toContain('--d-v*');
    expect(cursor).toContain('Pas de palette v2');
  });
});
