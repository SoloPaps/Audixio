import { describe, expect, it } from 'vitest';
import { historyRowsForPlan } from './history-depth.js';

const rows = [
  { id: 'a', created_at: '2026-01-01T12:00:00Z' },
  { id: 'b', created_at: '2026-05-01T12:00:00Z' },
  { id: 'c', created_at: '2026-05-01T12:00:00Z' },
];
describe('U5 — profondeur 1', () => {
  it('gratuit, inconnu ou erreur de profil : dernier seul, départage par ID', () => {
    for (const plan of [null, '', 'free', 'PRO']) {
      expect(historyRowsForPlan(rows, plan)).toEqual([rows[2]]);
    }
    expect(historyRowsForPlan([], null)).toEqual([]);
    expect(rows).toHaveLength(3);
  });
  it('Pro : tous les audits restent disponibles', () => {
    expect(historyRowsForPlan(rows, 'pro')).toEqual(rows);
  });
});
