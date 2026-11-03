import { describe, expect, it } from 'vitest';
import { auditGetId } from './audit-get-node.js';

const ID = '00000000-0000-4000-8000-0000000000b5';

describe('auditGetId', () => {
  it('lit le GET d’un audit', () => {
    expect(auditGetId(`/api/audits/${ID}`, 'GET')).toBe(ID);
    expect(auditGetId(`/api/audits/${ID}/`, 'get')).toBe(ID);
  });

  it('laisse le brief et les autres verbes au routeur', () => {
    expect(auditGetId(`/api/audits/${ID}/brief`, 'GET')).toBeNull();
    expect(auditGetId(`/api/audits/${ID}`, 'POST')).toBeNull();
    expect(auditGetId('/api/audits', 'GET')).toBeNull();
    expect(auditGetId('/api/guest-audits', 'GET')).toBeNull();
  });
});
