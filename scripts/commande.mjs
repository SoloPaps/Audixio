import { execFileSync, spawn } from 'node:child_process';

/**
 * Lancer pnpm, npx ou tsx depuis Node sur tous les systèmes. Sous Windows ce
 * sont des scripts `.cmd` : les lancer sans shell y échoue (ENOENT) et Node
 * refuse un `.cmd` sans shell. On passe alors par le shell, avec une seule
 * ligne de commande dont les arguments sont cités.
 */
function quote(arg) {
  return /^[\w@%+=:,./\\-]+$/u.test(arg)
    ? arg
    : `"${arg.replace(/"/gu, '""')}"`;
}

export function commande(name, args = [], platform = process.platform) {
  if (platform !== 'win32') return { cmd: name, args, shell: false };
  return { cmd: [name, ...args].map(quote).join(' '), args: [], shell: true };
}

/** `spawn` de `node:child_process`, qui marche aussi sous Windows. */
export function spawnCommande(name, args = [], options = {}) {
  const c = commande(name, args);
  return spawn(c.cmd, c.args, { ...options, shell: c.shell });
}

/** `execFileSync` de `node:child_process`, qui marche aussi sous Windows. */
export function execFileCommande(name, args = [], options = {}) {
  const c = commande(name, args);
  return execFileSync(c.cmd, c.args, { ...options, shell: c.shell });
}
