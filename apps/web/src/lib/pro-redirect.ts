import { browserClient, currentSession } from './browser-session.js';

/** Vrai si la session courante est un compte Pro (profil lu par Supabase). */
export async function isProAccount(): Promise<boolean> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) return false;
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .maybeSingle();
  return data?.plan === 'pro';
}

/** #38 : un compte Pro n’a rien à faire sur /passer-pro, il va sur /compte. */
export async function redirectProToAccount(
  go: (href: string) => void,
): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) return;
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .maybeSingle();
  if (data?.plan === 'pro') go('/compte');
}

/**
 * Question 1 : /passer-pro n’est plus une page. Pro va sur /compte,
 * visiteur et compte gratuit vont sur /pro, avec la requête et l’ancre.
 */
export async function routeUpgrade(
  go: (href: string) => void,
  rest = '',
): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (session && supabase) {
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data?.plan === 'pro') {
      go('/compte');
      return;
    }
  }
  go(`/pro${rest}`);
}
