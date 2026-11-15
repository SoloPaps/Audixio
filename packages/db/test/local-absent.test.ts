import { describe, expect, it } from 'vitest';
import { ensureLocalSupabase, SUPABASE_ABSENT } from './local.js';

// Sans base locale, les tests qui en ont besoin échouaient au bout du
// délai du hook (supabase start bloqué). Ils échouent maintenant tout de suite.
describe('Supabase local absent', () => {
  const closed = async () => false;

  it('échoue tout de suite avec « lancez supabase start »', async () => {
    const started = Date.now();
    await expect(ensureLocalSupabase({}, closed)).rejects.toThrow(
      SUPABASE_ABSENT,
    );
    expect(SUPABASE_ABSENT).toContain('supabase start');
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('ne fait rien quand la base répond', async () => {
    await expect(
      ensureLocalSupabase({}, async () => true),
    ).resolves.toBeUndefined();
  });
});
