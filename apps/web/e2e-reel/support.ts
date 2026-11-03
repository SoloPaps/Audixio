import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from '@playwright/test';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

export const STATE = '/tmp/audixio-e2e-reel.json';
export const AUTH = '/tmp/audixio-e2e-auth.json';
export const LAB = 'https://mauvais.audigy.test/';
const boite = 'http://127.0.0.1:54324';

export interface ReelState {
  email: string;
  password: string;
  auditId?: string;
  siteId?: string;
}

export async function readState(): Promise<ReelState> {
  return JSON.parse(await readFile(STATE, 'utf8')) as ReelState;
}

export async function writeState(next: ReelState): Promise<void> {
  await writeFile(STATE, JSON.stringify(next), { mode: 0o600 });
}

function localApi(): void {
  const env = { ...process.env };
  delete env.SUPABASE_ACCESS_TOKEN;
  delete env.SUPABASE_INTERNAL_ACCESS_TOKEN;
  delete env.SUPABASE_URL;
  delete env.SUPABASE_ANON_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  const text = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = text.split(/\r?\n/).find((row) => row.startsWith('API_URL='));
  const raw = (line ?? '').slice('API_URL='.length).replace(/^["']|["']$/g, '');
  const host = new URL(raw).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('refus : la base n’est pas locale');
  }
}

function sql(statement: string): void {
  localApi();
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_audigy',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      statement,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function assertEmail(email: string): void {
  if (!/^e2e-[a-z0-9-]+@exemple\.test$/.test(email)) {
    throw new Error('adresse de test refusée');
  }
}

function assertUuid(id: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error('identifiant refusé');
  }
}

export function ageConfirmation(email: string): void {
  assertEmail(email);
  sql(
    `update auth.users set confirmation_sent_at = now() - interval '2 hours' where email = '${email}';`,
  );
  sql(
    `update auth.one_time_tokens set created_at = now() - interval '2 hours', updated_at = now() - interval '2 hours', expires_at = now() - interval '1 hour' where user_id = (select id from auth.users where email = '${email}') and token_type = 'confirmation_token';`,
  );
}

export function ageReport(id: string): void {
  assertUuid(id);
  sql(
    `update public.reports set expires_at = now() - interval '1 minute' where id = '${id}';`,
  );
}

interface MailRow {
  ID: string;
  Created: string;
}

export async function waitMailLink(
  email: string,
  kind: 'signup' | 'recovery',
  afterMs: number,
): Promise<string> {
  const type = kind === 'signup' ? 'signup' : 'recovery';
  const query = encodeURIComponent(`to:${email}`);
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const list = await fetch(`${boite}/api/v1/search?query=${query}`);
    if (list.ok) {
      const body = (await list.json()) as { messages?: MailRow[] };
      const fresh = (body.messages ?? []).filter(
        (row) => new Date(row.Created).getTime() >= afterMs - 2000,
      );
      for (const row of fresh) {
        const detail = await fetch(`${boite}/api/v1/message/${row.ID}`);
        if (!detail.ok) continue;
        const full = (await detail.json()) as { HTML?: string; Text?: string };
        const raw = `${full.HTML ?? ''}\n${full.Text ?? ''}`.replaceAll(
          '&amp;',
          '&',
        );
        const found = raw.match(
          /https?:\/\/(?:127\.0\.0\.1|localhost):8888\/api\/auth\/callback\?\S+/g,
        );
        const link = found?.find((item) => item.includes(`type=${type}`));
        if (link) return link.replace('://localhost:', '://127.0.0.1:');
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('message absent');
}

export async function mobile(
  browser: Browser,
  storage: boolean,
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 330, height: 720 },
    locale: 'fr-FR',
    ...(storage ? { storageState: AUTH } : {}),
  });
  return context.newPage();
}
