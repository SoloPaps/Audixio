import { execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
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

export default async function globalSetup(): Promise<void> {
  if (!(await portOpen(54321))) {
    throw new Error('le serveur local n’écoute pas');
  }
  sql('delete from public.rate_limits;');
  sql(
    "update public.audits a set created_at = now() - interval '20 minutes' from public.sites s where a.site_id = s.id and s.host like '%.audigy.test' and a.created_at > now() - interval '16 minutes';",
  );
  sql(
    "update public.audits a set status = 'failed', created_at = now() - interval '20 minutes', finished_at = coalesce(a.finished_at, now()) from public.sites s where a.site_id = s.id and s.host like '%.audigy.test' and a.status in ('queued', 'running', 'partial');",
  );
}
