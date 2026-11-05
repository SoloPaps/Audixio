/**
 * Labo pour `pnpm test:ui` : sert `fixtures/sites` sous `*.audigy.test`.
 * N’écrit pas `.env` et ne lève pas le plafond visiteur.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LAB_FILE, startLab } from '../fixtures/lab.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lab = await startLab();
const full = path.resolve(root, DEFAULT_LAB_FILE);
await mkdir(path.dirname(full), { recursive: true });
await writeFile(full, `${JSON.stringify(lab.config)}\n`);
console.log('labo ui prêt');

const stop = async () => {
  await lab.close();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
await new Promise(() => {});
