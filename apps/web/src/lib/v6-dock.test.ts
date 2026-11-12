import { describe, expect, it } from 'vitest';
import { dockState } from './v6-dock.js';

describe('barre de sections', () => {
  it('prend la dernière section qui a passé la ligne', () => {
    expect(dockState([100, 400, 800], 450, []).active).toBe(1);
    expect(dockState([100, 400, 800], 450, []).on).toBe(true);
  });

  it('se cache quand une zone interdite coupe la ligne', () => {
    expect(dockState([20, 400], 300, [{ top: 0, bottom: 500 }]).on).toBe(false);
  });

  it('reste visible si la zone interdite est déjà sortie', () => {
    expect(dockState([20], 300, [{ top: -800, bottom: 0 }]).on).toBe(true);
  });
});
