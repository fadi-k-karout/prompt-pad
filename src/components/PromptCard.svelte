<script lang="ts">
  import type { Prompt } from "../lib/types.js";
  import { formatRelativeTime } from "../lib/format.js";
  import { copyText } from "../lib/clipboard.js";

  interface Props {
    prompt: Prompt;
    onedit: () => void;
    ondelete: () => void;
  }

  let { prompt, onedit, ondelete }: Props = $props();

  // A content script's window.confirm() surfaces in the host page's context and
  // gets blocked by plenty of sites, so the confirmation stays inline. Delete
  // confirmation and copy failure share one slot so the two never stack into two
  // competing red banners on the same card.
  type CardNotice = { kind: "confirm-delete" } | { kind: "copy-failed" };

  let notice = $state<CardNotice | null>(null);
  let hasCopied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const wasEdited = $derived(prompt.updatedAt !== prompt.createdAt);

  async function handleCopy(event: MouseEvent) {
    // copyText must run before any await: Safari rejects the write once the
    // click's transient user activation is gone, and so does the fallback.
    const copied = await copyText(
      prompt.content,
      event.currentTarget as HTMLElement,
    );

    if (!copied) {
      hasCopied = false;
      notice = { kind: "copy-failed" };
      return;
    }

    notice = null;
    hasCopied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (hasCopied = false), 1500);
  }

  // An unmount mid-feedback (HMR, deleting the prompt) would otherwise leave a
  // timer pointing at state nobody renders any more.
  $effect(() => {
    return () => clearTimeout(copyTimer);
  });
</script>

<li
  class="rounded-lg border border-border bg-card p-3 transition-colors hover:border-input"
>
  <div class="flex items-start justify-between gap-2">
    <h3
      class="min-w-0 flex-1 truncate text-sm font-semibold text-card-foreground"
    >
      {prompt.title}
    </h3>
    <div class="flex shrink-0 items-center gap-1">
      {#if prompt.content}
        <button
          type="button"
          onclick={handleCopy}
          title="Copy prompt"
          aria-label={`Copy ${prompt.title}`}
          class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {#if hasCopied}
            <svg
              class="h-4 w-4"
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
          {:else}
            <svg
              class="h-4 w-4"
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
          {/if}
        </button>
        <!-- The icon swap alone is invisible to a screen reader, and swapping
             aria-label on a focused button is not announced reliably either. -->
        <span class="sr-only" role="status" aria-live="polite">
          {hasCopied ? `${prompt.title} copied to clipboard` : ""}
        </span>
      {/if}
      <button
        type="button"
        onclick={onedit}
        title="Edit prompt"
        aria-label={`Edit ${prompt.title}`}
        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
          />
        </svg>
      </button>
      <button
        type="button"
        onclick={() => (notice = { kind: "confirm-delete" })}
        title="Delete prompt"
        aria-label={`Delete ${prompt.title}`}
        class="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:outline-none"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </button>
    </div>
  </div>

  {#if prompt.content}
    <p
      class="mt-1.5 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground"
    >
      {prompt.content}
    </p>
  {/if}

  {#if prompt.tags.length > 0}
    <ul class="mt-2 flex flex-wrap gap-1">
      <!-- Unkeyed on purpose: a keyed each throws on duplicate keys, and
           duplicate tags can still arrive from hand-edited storage. -->
      {#each prompt.tags as tag}
        <li
          class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tag}
        </li>
      {/each}
    </ul>
  {/if}

  <p class="mt-2 text-xs text-muted-foreground">
    {#if wasEdited}
      Edited {formatRelativeTime(prompt.updatedAt)}
      <span aria-hidden="true">·</span>
      Created {formatRelativeTime(prompt.createdAt)}
    {:else}
      Created {formatRelativeTime(prompt.createdAt)}
    {/if}
  </p>

  {#if notice?.kind === "confirm-delete"}
    <div
      class="mt-2 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-2.5 py-2"
    >
      <span class="text-xs font-medium text-destructive"
        >Delete this prompt?</span
      >
      <span class="flex items-center gap-1">
        <button
          type="button"
          onclick={ondelete}
          class="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:outline-none"
        >
          Delete
        </button>
        <button
          type="button"
          onclick={() => (notice = null)}
          class="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          Cancel
        </button>
      </span>
    </div>
  {:else if notice?.kind === "copy-failed"}
    <p
      role="alert"
      class="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
    >
      Could not copy. Your browser may be blocking clipboard access on this
      page.
    </p>
  {/if}
</li>
