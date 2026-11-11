<script lang="ts">
import CanonBar from '../CanonBar.svelte';

interface Props {
  pathname: string;
}

let { pathname }: Props = $props();
</script>

<!-- Même barre que le site actuel. Les jetons et Geist viennent du gabarit v6. -->
<CanonBar {pathname} />
