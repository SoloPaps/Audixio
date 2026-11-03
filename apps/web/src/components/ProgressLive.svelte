<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { readGuestAudit } from '../lib/guest-store.js';
import { loginHref } from '../lib/nav.js';
import {
  guestDisplayStatus,
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

  const paint = (
    payload: AuditPayload,
    revealed: boolean,
    guest: boolean,
  ): void => {
    const host = hostOf(payload.audit.site.url);
    for (const node of document.querySelectorAll('.mono')) {
      node.textContent = host;
    }
    const names = payload.domains
      .filter((domain) => typeof domain.score === 'number')
      .map((domain) => domain.domain);
    const shown = guestDisplayStatus(payload.audit.status, revealed);
    const waiting = shown === 'queued' || shown === 'running';
    if (status) status.textContent = progressLive(shown, names);
    if (home) home.hidden = !waiting;
    const phase = progressPhase(
      shown,
      names.length,
      names.includes('vie_privee'),
    );
    const remain = progressEta(shown, names.length);
    if (lead && phase) lead.textContent = phase;
    if (eta && remain) eta.textContent = remain;
    const done = shown === 'done' || shown === 'partial';
    const href = `/rapport?id=${encodeURIComponent(payload.audit.id)}`;
    if (report && reportLink) {
      report.hidden = !done;
      reportLink.setAttribute('href', href);
    }
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) reportBtn.setAttribute('href', href);
    if (done && guest) document.body.classList.add('done');
    const fail = document.getElementById('fail-back');
    const failLink = document.getElementById('fail-link');
    if (fail && failLink) {
      const failed = shown === 'failed';
      fail.hidden = !failed;
      if (failed) {
        failLink.setAttribute(
          'href',
          `/audit-echoue?id=${encodeURIComponent(payload.audit.id)}`,
        );
      }
    }
  };

  const tick = async (): Promise<void> => {
    const session = await currentSession();
    if (cancelled) return;
    if (!session) {
      const stored = readGuestAudit(id);
      if (!stored) {
        location.replace(loginHref(`${location.pathname}${location.search}`));
        return;
      }
      paint(stored, false, true);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        paint(stored, true, true);
      }, POLL_MS);
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
    paint(result.payload, true, false);
    if (
      result.payload.audit.status === 'done' ||
      result.payload.audit.status === 'failed' ||
      result.payload.audit.status === 'partial'
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
