<script lang="ts">
import { t } from '../i18n/index.js';
import { loginHref, signupHref } from '../lib/nav.js';

interface Props {
  title: string;
  lead?: string;
  status?: string;
  next: string;
}

let { title, lead = '', status = '', next }: Props = $props();
</script>

<section class="session-wall" aria-labelledby="h1">
  <h1 id="h1">{title}</h1>
  {#if lead}<p class="lede" role={status ? undefined : 'status'}>{lead}</p>{/if}
  {#if status}<p role="status">{status}</p>{/if}
  <p class="session-acts">
    <a class="btn btn-primary" href={loginHref(next)}>{t('nav.login')}</a>
    <a class="btn btn-ghost" href={signupHref(next)}>{t('guest.gate.signup')}</a>
  </p>
</section>
