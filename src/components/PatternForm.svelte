<script lang="ts">
  import { untrack } from "svelte";
  import {
    PROMPT_PATTERNS,
    resolveVariables,
    type TemplateVariable,
  } from "../lib/promptPatterns.js";
  import {
    renderSegments,
    segmentsToText,
    findMissingVariables,
    findLeftoverTokens,
  } from "../lib/template.js";
  import { copyText } from "../lib/clipboard.js";

  interface Props {
    patternId: string;
    /** Hands over the rendered prompt text, ready for the composer. */
    oncreate: (content: string) => void;
    oncancel: () => void;
  }

  let { patternId, oncreate, oncancel }: Props = $props();

  // Seeding once is deliberate, same as the composer's: the list mounts a form
  // per pattern, so picking a different template builds fresh state rather
  // than carrying the previous pattern's fields over.
  const { pattern, variables } = untrack(() => {
    const found = PROMPT_PATTERNS[patternId];
    return { pattern: found, variables: resolveVariables(found) };
  });

  let values = $state<Record<string, string>>(
    Object.fromEntries(variables.map((variable) => [variable.name, ""])),
  );

  // Field elements are tracked directly rather than looked up by id:
  // document.getElementById cannot see inside the shadow root.
  let fields = $state<Record<string, HTMLElement>>({});

  const segments = $derived(renderSegments(pattern.template, values));
  const rendered = $derived(segmentsToText(segments));
  const missing = $derived(findMissingVariables(segments));
  const leftover = $derived(findLeftoverTokens(rendered));
  const canUse = $derived(missing.length === 0);

  // The text that was copied, rather than a boolean, because the preview is
  // live: editing any field changes `rendered` and so drops the confirmation on
  // its own, since it referred to text that is no longer on screen.
  let copiedText = $state<string | null>(null);
  let copyFailed = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const didCopy = $derived(copiedText !== null && copiedText === rendered);

  function isFilled(variable: TemplateVariable): boolean {
    return (values[variable.name] ?? "").trim().length > 0;
  }

  function handleInput(variable: TemplateVariable, event: Event) {
    values[variable.name] = (event.currentTarget as HTMLInputElement).value;
  }

  async function handleCopy(event: MouseEvent) {
    // copyText must run before any await: Safari rejects the write once the
    // click's transient user activation is gone, and so does the fallback.
    const text = rendered;
    const copied = await copyText(text, event.currentTarget as HTMLElement);
    if (!copied) {
      copiedText = null;
      copyFailed = true;
      return;
    }
    copyFailed = false;
    copiedText = text;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedText = null), 1500);
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!canUse) return;
    oncreate(rendered);
  }

  // An unmount mid-feedback (leaving the form, HMR) would otherwise leave a
  // timer pointing at state nobody renders any more.
  $effect(() => {
    return () => clearTimeout(copyTimer);
  });

  const fieldClass =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
</script>

<form
  class="flex flex-col gap-3 rounded-lg border border-border bg-muted p-3"
  onsubmit={handleSubmit}
>
  <div class="flex flex-col gap-0.5">
    <h3 class="text-sm font-semibold text-foreground">{pattern.name}</h3>
    <p class="text-xs text-muted-foreground">{pattern.description}</p>
  </div>

  <!-- Jumping to a field matters once a pattern has five of them and the
       preview has scrolled the relevant slot out of view. -->
  <ul class="flex flex-wrap gap-1">
    {#each variables as variable (variable.name)}
      <li>
        <button
          type="button"
          onclick={() => fields[variable.name]?.focus()}
          class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none {isFilled(
            variable,
          )
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-muted text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground'}"
        >
          {variable.label}
        </button>
      </li>
    {/each}
  </ul>

  {#each variables as variable (variable.name)}
    <div class="flex flex-col gap-1">
      <label
        for="pattern-var-{variable.name}"
        class="text-xs font-semibold text-foreground"
      >
        {variable.label}
      </label>
      {#if variable.multiline}
        <textarea
          id="pattern-var-{variable.name}"
          bind:this={fields[variable.name]}
          value={values[variable.name]}
          oninput={(event) => handleInput(variable, event)}
          rows={variable.rows}
          placeholder={variable.placeholder}
          class="{fieldClass} resize-y"></textarea>
      {:else}
        <input
          id="pattern-var-{variable.name}"
          type="text"
          bind:this={fields[variable.name]}
          value={values[variable.name]}
          oninput={(event) => handleInput(variable, event)}
          placeholder={variable.placeholder}
          class={fieldClass}
        />
      {/if}
    </div>
  {/each}

  {#if leftover.length > 0}
    <p
      role="alert"
      class="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
    >
      Left as literal text: {leftover.map((token) => `{${token}}`).join(", ")}
      -- these look like template slots, so check the values you pasted.
    </p>
  {/if}

  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-semibold text-foreground">Preview</span>
      <button
        type="button"
        onclick={handleCopy}
        disabled={!canUse}
        title={copyFailed ? "Copy failed" : "Copy the rendered prompt"}
        class="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        {#if didCopy}
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          Copied
        {:else}
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
            />
          </svg>
          Copy
        {/if}
      </button>
      <!-- The label swap alone is invisible to a screen reader, and swapping
           aria-label on a focused button is not announced reliably either. -->
      <span class="sr-only" role="status" aria-live="polite">
        {didCopy
          ? "Rendered prompt copied to clipboard"
          : copyFailed
            ? "Could not copy the rendered prompt"
            : ""}
      </span>
    </div>
    <!--
      Not a live region: it re-renders on every keystroke, and announcing each
      one would make the form unusable with a screen reader. The unfilled-slot
      count below carries the same information without the noise.
    -->
    <div
      aria-label="Rendered prompt preview"
      class="max-h-40 overflow-y-auto rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs whitespace-pre-wrap wrap-break-word text-muted-foreground"
    >
      {#each segments as segment, index (index)}
        {#if segment.kind === "text"}
          {segment.value}
        {:else if segment.filled}
          {segment.value}
        {:else}
          <span
            class="rounded bg-destructive/15 px-0.5 font-semibold text-destructive"
            >{`{${segment.name}}`}</span
          >
        {/if}
      {/each}
    </div>
    {#if copyFailed}
      <p
        role="alert"
        class="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
      >
        Could not copy. Your browser may be blocking clipboard access on this
        page.
      </p>
    {/if}
  </div>

  <div class="flex items-center justify-between gap-2">
    <span class="text-xs text-muted-foreground">
      {#if canUse}
        Ready to create.
      {:else}
        {missing.length}
        {missing.length === 1 ? "field" : "fields"} left
      {/if}
    </span>
    <span class="flex items-center gap-2">
      <button
        type="button"
        onclick={oncancel}
        class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={!canUse}
        class="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        Create prompt
      </button>
    </span>
  </div>
</form>
