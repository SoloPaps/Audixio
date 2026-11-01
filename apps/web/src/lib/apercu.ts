import type { Database } from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Note globale autorisée. `null` si le site n’est pas prouvé ou si la lecture échoue. */
export async function scoreAutorise(
  supabase: SupabaseClient<Database>,
  auditId: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('read_rapport_apercu', {
    p_audit_id: auditId,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const score = (data as { score_global?: unknown }).score_global;
  return typeof score === 'number' ? score : null;
}
