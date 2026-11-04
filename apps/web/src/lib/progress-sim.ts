/** Pas de la maquette finale : +0,5 % toutes les 400 ms, pas des paliers. */
export const PER_TICK = 0.5;
export const TICK_MS = 400;

export const STAGES = [
  {
    key: 'perf',
    until: 82,
    phrases: [
      'Analyse de la compression des images et du poids global',
      'Vérification de la fluidité et du confort de lecture sur smartphone',
    ],
  },
  {
    key: 'a11y',
    until: 91,
    phrases: ['Contrôle des contrastes et de la navigation au clavier'],
  },
  {
    key: 'code',
    until: 99,
    phrases: [
      'Lecture du code source et recherche des erreurs',
      'Génération de la synthèse finale et des recommandations',
    ],
  },
] as const;

export interface DomainUpdate {
  key: string;
  state: 'done' | 'active' | 'next';
}

export interface Sim {
  percent: number;
  si: number;
  spoke: number;
  finished: boolean;
  phrase: string | null;
  domains: DomainUpdate[];
}

export function createSim(): Sim {
  return {
    percent: 70,
    si: 0,
    spoke: 0,
    finished: false,
    phrase: null,
    domains: [],
  };
}

/** Texte sous la barre. Vide à 100 % : plus de délai affiché. */
export function etaLabel(percent: number): string {
  if (percent >= 100) return '';
  const seconds = Math.max(
    0,
    Math.ceil(((100 - percent) / PER_TICK) * (TICK_MS / 1000)),
  );
  if (seconds <= 0) return '';
  return `~${seconds} seconde${seconds > 1 ? 's' : ''}`;
}

export function tickSim(sim: Sim): Sim {
  if (sim.finished) return sim;
  const stage = STAGES[sim.si];
  if (!stage) return { ...sim, finished: true, domains: [], phrase: null };
  const percent = Math.min(100, sim.percent + PER_TICK);
  const previous = sim.si > 0 ? (STAGES[sim.si - 1]?.until ?? 70) : 70;
  const mid = (stage.until - previous) / 2 + previous;
  let spoke = sim.spoke;
  let phrase: string | null = null;
  if (stage.phrases.length > 1 && spoke === 0 && percent >= mid) {
    spoke = 1;
    phrase = stage.phrases[1] ?? null;
  }
  if (percent < stage.until) {
    return { ...sim, percent, spoke, phrase, domains: [] };
  }
  const si = sim.si + 1;
  const domains: DomainUpdate[] = [{ key: stage.key, state: 'done' }];
  if (si >= STAGES.length || percent >= 99.5) {
    return { percent, si, spoke: 0, finished: true, phrase, domains };
  }
  const next = STAGES[si];
  const after = STAGES[si + 1];
  if (next) domains.push({ key: next.key, state: 'active' });
  if (after) domains.push({ key: after.key, state: 'next' });
  return {
    percent,
    si,
    spoke: 0,
    finished: false,
    phrase: next?.phrases[0] ?? phrase,
    domains,
  };
}
