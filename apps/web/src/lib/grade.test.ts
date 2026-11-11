import { describe, expect, it } from 'vitest';
import { installPack } from '../i18n/pack.js';
import { gradeCopy, gradeForScore, gradeLabel } from './grade.js';

describe('note en lettre', () => {
  it('suit les seuils', () => {
    expect(gradeForScore(95)).toBe('A');
    expect(gradeForScore(86)).toBe('B');
    expect(gradeForScore(70)).toBe('C');
    expect(gradeForScore(50)).toBe('D');
    expect(gradeForScore(40)).toBe('E');
    expect(gradeForScore(10)).toBe('F');
  });

  it('reste vide sans note', () => {
    expect(gradeForScore(null)).toBeNull();
    expect(gradeCopy(null)).toBeNull();
  });

  it('écrit la lettre, le libellé et le /100', () => {
    const copy = gradeCopy(86);
    expect(copy?.letter).toBe('Note B');
    expect(copy?.label).toMatch(/\(86\/100\)$/);
  });

  it('A se lit « Excellent », comme le barème de /methode', () => {
    expect(gradeLabel('A')).toBe('Excellent');
    expect(gradeLabel('B')).toBe('Bon');
    expect(gradeLabel('C')).toBe('À améliorer');
    expect(gradeLabel('D')).toBe('Problème');
    expect(gradeCopy(95)?.label).toBe('Excellent (95/100)');
    expect(gradeCopy(86)?.label).toBe('Bon (86/100)');
  });

  it('A se lit « Excellent » en anglais aussi', () => {
    installPack({ 'level.excellent': 'Excellent', 'level.good': 'Good' });
    try {
      expect(gradeLabel('A')).toBe('Excellent');
      expect(gradeLabel('B')).toBe('Good');
    } finally {
      installPack(null);
    }
  });
});
