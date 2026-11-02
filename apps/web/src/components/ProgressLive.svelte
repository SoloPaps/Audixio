<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import {
  progressEta,
  progressLive,
  progressPhase,
} from '../lib/progress-live.js';

const POLL_MS = 1500;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

onMount(() => {
  const id = new URLSearchParams(location.search).get('id');
  const status = document.getElementById('liveT');
  const home = document.getElementById('home-back');
  const report = document.getElementById('report-back');
  const reportLink = document.getElementById('report-link');
  const lead = document.getElementById('leadT');
  const eta = document.getElementById('timeLeft');
  if (!id) return;

  let timer = 0;
  let cancelled = false;

  const tick = async (): Promise<void> => {
    const session = await currentSession();
    if (cancelled) return;
    if (!session) {
      location.replace(loginHref(`${location.pathname}${location.search}`));
      return;
    }
    const result = await readAudit(session.access_token, id);
    if (cancelled) return;
    if (!result.ok) {
      if (status) {
        status.textContent =
          result.status === 404 ? t('progress.missing') : result.message;
      }
      return;
    }
    const payload = result.payload;
    const host = hostOf(payload.audit.site.url);
    for (const node of document.querySelectorAll('.mono')) {
      node.textContent = host;
    }
    const names = payload.domains
      .filter((domain) => typeof domain.score === 'number')
      .map((domain) => domain.domain);
    const waiting =
      payload.audit.status === 'queued' || payload.audit.status === 'running';
    if (status) status.textContent = progressLive(payload.audit.status, names);
    if (home) home.hidden = !waiting;
    const phase = progressPhase(
      payload.audit.status,
      names.length,
      names.includes('vie_privee'),
    );
    const remain = progressEta(payload.audit.status, names.length);
    if (lead && phase) lead.textContent = phase;
    if (eta && remain) eta.textContent = remain;
    const done =
      payload.audit.status === 'done' || payload.audit.status === 'partial';
    if (report && reportLink) {
      report.hidden = !done;
      reportLink.setAttribute(
        'href',
        `/rapport?id=${encodeURIComponent(payload.audit.id)}`,
      );
    }
    if (
      payload.audit.status === 'done' ||
      payload.audit.status === 'failed' ||
      payload.audit.status === 'partial'
    ) {
      return;
    }
    timer = window.setTimeout(() => {
      void tick();
    }, POLL_MS);
  };

  void tick();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
});
</script>
