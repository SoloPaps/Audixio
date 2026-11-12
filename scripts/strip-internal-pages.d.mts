export const INTERNAL_PREFIXES: string[];
export function relativePosix(
  dist: string,
  file: string,
  paths?: typeof import('node:path'),
): string;
export function listInternalPages(dist: string): Promise<string[]>;
export function stripInternalPages(dist: string): Promise<void>;
export function assertInternalPagesAbsent(dist: string): Promise<void>;
export function exists(file: string): Promise<boolean>;
