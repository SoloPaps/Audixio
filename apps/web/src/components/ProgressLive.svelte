<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { readGuestAudit } from '../lib/guest-store.js';
import { loginHref } from '../lib/nav.js';
import {
  guestBeatPhase,
  guestDisplayStatus,
  progressEta,
  progressLive,
  progressPhase,
} from '../lib/progress-live.js';

const POLL_MS = 1500;
const GUEST_BEAT_MS = 800;

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
  const heading = document.getElementById('h1T');
  const lead = document.getElementById('leadT');
  const task = document.getElementById('task');
  const eta = document.getElementById('timeLeft');
  const slot = document.getElementById('ready-slot');
  if (!id) return;

  let timer = 0;
  let cancelled = false;

  const meter = (value: number): void => {
    const pct = document.getElementById('pct');
    const fill = document.getElementById('fill');
    const bar = document.getElementById('pbar');
    if (pct) pct.textContent = String(value);
    if (fill) fill.style.width = `${value}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(value));
  };

  const paint = (
    payload: AuditPayload,
    revealed: boolean,
    guest: boolean,
    step: number,
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
    const phase = guest
      ? guestBeatPhase(step)
      : progressPhase(shown, names.length, names.includes('vie_privee'));
    const remain = progressEta(shown, names.length);
    if (eta && remain) eta.textContent = remain;
    const done = shown === 'done' || shown === 'partial';
    const failed = shown === 'failed';
    if (done) {
      if (heading) heading.textContent = t('progress.ready.heading');
      if (lead) lead.textContent = t('progress.ready.lead');
      if (task) task.textContent = t('progress.ready');
      meter(100);
    } else if (heading) {
      heading.textContent = t('mq.p.004');
      if (lead && phase) lead.textContent = phase;
      if (task && phase) task.textContent = phase;
      if (guest) meter(25 + step * 25);
    }
    const href = `/rapport?id=${encodeURIComponent(payload.audit.id)}`;
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) reportBtn.setAttribute('href', href);
    if (done && slot && reportBtn) {
      slot.hidden = false;
      if (reportBtn.parentElement !== slot) slot.appendChild(reportBtn);
    }
    document.body.classList.toggle('done', done);
    const fail = document.getElementById('fail-back');
    const failLink = document.getElementById('fail-link');
    if (fail && failLink) {
      fail.hidden = !failed;
      if (failed) {
        failLink.setAttribute(
          'href',
          `/audit-echoue?id=${encodeURIComponent(payload.audit.id)}`,
        );
        if (lead) lead.textContent = t('progress.failed');
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
      let step = 0;
      const beat = (): void => {
        if (cancelled) return;
        if (step < 3) {
          paint(stored, false, true, step);
          step += 1;
          timer = window.setTimeout(beat, GUEST_BEAT_MS);
          return;
        }
        paint(stored, true, true, step);
      };
      beat();
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
    paint(result.payload, true, false, 0);
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
