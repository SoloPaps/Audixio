export function commande(
  name: string,
  args?: readonly string[],
  platform?: NodeJS.Platform,
): { cmd: string; args: string[]; shell: boolean };
export function spawnCommande(
  name: string,
  args?: readonly string[],
  options?: import('node:child_process').SpawnOptions,
): import('node:child_process').ChildProcess;
export function execFileCommande(
  name: string,
  args: readonly string[],
  options: import('node:child_process').ExecFileSyncOptionsWithStringEncoding,
): string;
export function execFileCommande(
  name: string,
  args?: readonly string[],
  options?: import('node:child_process').ExecFileSyncOptions,
): string | Buffer;
