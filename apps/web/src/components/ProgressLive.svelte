<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import {
  type AuditPayload,
  createAudit,
  createGuestAudit,
  readAudit,
} from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { readGuestAudit, saveGuestAudit } from '../lib/guest-store.js';
import { loginHref } from '../lib/nav.js';
import {
  guestBeatPhase,
  guestDisplayStatus,
  progressLive,
  progressPhase,
} from '../lib/progress-live.js';
import { progressionHref } from '../lib/relaunch.js';
import GuestGate from './GuestGate.svelte';

let gate = $state(false);

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
  const params = new URLSearchParams(location.search);
  let id = params.get('id');
  const status = document.getElementById('liveT');
  const home = document.getElementById('home-back');
  const heading = document.getElementById('h1T');
  const lead = document.getElementById('leadT');
  const task = document.getElementById('task');
  const eta = document.getElementById('timeLeft');
  if (!id && !params.get('url') && !params.get('site')) return;

  let timer = 0;
  let cancelled = false;

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
    const done = shown === 'done' || shown === 'partial';
    const failed = shown === 'failed';
    if (done) {
      if (heading) heading.textContent = t('progress.ready.heading');
      if (lead) lead.textContent = t('progress.ready.lead');
      if (task) task.textContent = t('progress.ready');
      if (eta) eta.textContent = '';
    } else if (heading) {
      heading.textContent = t('mq.p.004');
      if (lead && phase) lead.textContent = phase;
      if (task && phase) task.textContent = phase;
    }
    const href = `/rapport?id=${encodeURIComponent(payload.audit.id)}`;
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) reportBtn.setAttribute('href', href);
    const slot = document.getElementById('ready-slot');
    if (done && slot && reportBtn && reportBtn.parentElement !== slot) {
      slot.hidden = false;
      slot.append(reportBtn);
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

  const ensureId = async (): Promise<string | null> => {
    if (id) return id;
    const url = params.get('url');
    const siteId = params.get('site');
    if (!url && !siteId) return null;
    const session = await currentSession();
    if (!session) {
      if (!url) {
        gate = true;
        return null;
      }
      const guest = await createGuestAudit(url);
      if (!guest.ok) {
        if (guest.limit) gate = true;
        return null;
      }
      saveGuestAudit(guest.payload);
      history.replaceState(null, '', progressionHref(guest.payload.audit.id));
      return guest.payload.audit.id;
    }
    const result = await createAudit(
      session.access_token,
      siteId ? { siteId } : { url: url ?? '' },
    );
    if (!result.ok) return null;
    history.replaceState(null, '', progressionHref(result.auditId));
    return result.auditId;
  };

  const tick = async (): Promise<void> => {
    id = await ensureId();
    if (!id || cancelled) return;
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

{#if gate}
  <GuestGate open={true} onClose={() => { gate = false; }} />
{/if}
