<script lang="ts">
interface Props {
  id: string;
  label: string;
  prefix: string;
  placeholder: string;
  error: string;
  invalid?: boolean;
  disabled?: boolean;
  submit?: string;
}

let {
  id,
  label,
  prefix,
  placeholder,
  error,
  invalid = false,
  disabled = false,
  submit,
}: Props = $props();
</script>

<div class="field">
  <label class="sr" for={id}>{label}</label>
  <div class="inp">
    <span aria-hidden="true">{prefix}</span>
    <input
      {id}
      name="url"
      type="text"
      inputmode="url"
      autocomplete="url"
      {placeholder}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={invalid ? `${id}-err` : undefined}
      {disabled}
    />
  </div>
  {#if submit}
    <button class="btn" type="submit" {disabled}>
      {submit}
      <svg aria-hidden="true"><use href="#i-arrow" /></svg>
    </button>
  {/if}
</div>
{#if invalid}
  <p class="err" id={`${id}-err`} role="alert">{error}</p>
{/if}
