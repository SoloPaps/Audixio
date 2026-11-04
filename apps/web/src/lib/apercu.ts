import type { Database } from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ApercuDomaine {
  domaine: string;
  verrouille: boolean;
  note: string | null;
  score: number | null;
}

export interface ApercuCarte {
  score: number | null;
  grade: string | null;
  verified: boolean;
  domains: ApercuDomaine[];
}

export interface MesureDomaine {
  score: number | null;
  note: string | null;
  locked: boolean;
}

const MESURE_VIDE: MesureDomaine = { score: null, note: null, locked: false };

function domaine(value: unknown): ApercuDomaine | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.domaine !== 'string') return null;
  return {
    domaine: row.domaine,
    verrouille: row.verrouille === true,
    note: typeof row.note === 'string' ? row.note : null,
    score: typeof row.score === 'number' ? row.score : null,
  };
}

/** Lit le JSON de `read_rapport_apercu`. `null` si la forme n’est pas un objet. */
export function parseApercu(data: unknown): ApercuCarte | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  const domains = Array.isArray(row.domaines)
    ? row.domaines.flatMap((item) => {
        const parsed = domaine(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    score: typeof row.score_global === 'number' ? row.score_global : null,
    grade: typeof row.note_globale === 'string' ? row.note_globale : null,
    verified: row.site_verifie === true,
    domains,
  };
}

/** Score affiché d’un domaine. Une mesure verrouillée ne révèle ni note ni chiffre. */
export function mesureDomaine(
  carte: ApercuCarte | null,
  name: string,
): MesureDomaine {
  const found = carte?.domains.find((item) => item.domaine === name);
  if (!found) return { ...MESURE_VIDE };
  if (found.verrouille) return { score: null, note: null, locked: true };
  return { score: found.score, note: found.note, locked: false };
}

/** Note globale autorisée. `null` si le site n’est pas prouvé ou si la lecture échoue. */
export async function scoreAutorise(
  supabase: SupabaseClient<Database>,
  auditId: string,
): Promise<number | null> {
  const carte = await apercuCarte(supabase, auditId);
  return carte?.score ?? null;
}

/** Aperçu autorisé : note globale et domaines, ou `null` si la lecture échoue. */
export async function apercuCarte(
  supabase: SupabaseClient<Database>,
  auditId: string,
): Promise<ApercuCarte | null> {
  const { data, error } = await supabase.rpc('read_rapport_apercu', {
    p_audit_id: auditId,
  });
  if (error) return null;
  return parseApercu(data);
}
