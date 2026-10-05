<script lang="ts">
  import { promptStore } from "../lib/storage.svelte.js";
  import type { Prompt, PromptDraft } from "../lib/types.js";
  import { onEscape } from "../lib/actions.js";
  import PromptCard from "./PromptCard.svelte";
  import PromptComposer from "./PromptComposer.svelte";

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();

  let showComposer = $state(false);
  let editingId = $state<string | null>(null);
  let listError = $state<string | null>(null);

  const isEditing = $derived(editingId !== null);

  // The prompt being edited can disappear while its composer is open -- deleted
  // here, or synced in from the options page or a second tab. The composer then
  // leaves with it, and clearing the id here is what re-enables Add, instead of
  // stranding the panel until the next Escape.
  $effect(() => {
    if (editingId && !promptStore.getById(editingId)) editingId = null;
  });

  function toDraft(prompt: Prompt): PromptDraft {
    return { title: prompt.title, content: prompt.content, tags: prompt.tags };
  }

  function startCreate() {
    // Saving before the first read lands would write a one-prompt list over
    // whatever is already stored, so creation waits for a loaded list.
    if (!promptStore.isLoaded) return;
    editingId = null;
    showComposer = true;
  }

  function startEdit(id: string) {
    showComposer = false;
    editingId = id;
  }

  function cancelComposer() {
    showComposer = false;
    editingId = null;
  }

  async function handleCreate(draft: PromptDraft) {
    await promptStore.add(draft);
    showComposer = false;
  }

  async function handleUpdate(draft: PromptDraft) {
    if (!editingId) return;
    await promptStore.update(editingId, draft);
    editingId = null;
  }

  async function handleDelete(id: string) {
    listError = null;
    try {
      await promptStore.remove(id);
    } catch (err) {
      listError =
        err instanceof Error ? err.message : "Could not delete the prompt.";
    }
  }

  async function handleRetry() {
    listError = null;
    await promptStore.reload();
  }

  // Escape backs out one layer at a time, so a stray keypress does not discard
  // a half-written prompt along with the panel.
  function handleEscape() {
    if (showComposer || isEditing) {
      cancelComposer();
      return;
    }
    onclose();
  }
</script>

<section
  id="prompt-panel"
  class="flex max-h-[70vh] w-88 max-w-[92vw] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
  aria-label="Prompts"
  use:onEscape={handleEscape}
>
  <header
    class="flex items-center justify-between gap-2 border-b border-border px-4 py-3"
  >
    <h2 class="flex items-baseline gap-2 text-sm font-semibold">
      Prompts
      {#if promptStore.isLoaded}
        <span class="text-xs font-normal text-muted-foreground">
          {promptStore.count}
        </span>
      {/if}
    </h2>

    <span class="flex items-center gap-1">
      <button
        type="button"
        onclick={startCreate}
        disabled={showComposer || isEditing || !promptStore.isLoaded}
        class="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add
      </button>
      <button
        type="button"
        onclick={onclose}
        aria-label="Close prompts"
        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  </header>

  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
    {#if !promptStore.isLoaded}
      {#if promptStore.loadError}
        <div
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/30 bg-destructive/10 px-4 py-8 text-center"
        >
          <p role="alert" class="text-sm font-semibold text-destructive">
            Could not load your prompts
          </p>
          <p class="text-xs text-destructive">{promptStore.loadError}</p>
          <button
            type="button"
            onclick={handleRetry}
            class="mt-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            Try again
          </button>
        </div>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each Array(3) as _, index (index)}
            <li
              class="h-16 animate-pulse rounded-lg border border-border bg-muted"
            ></li>
          {/each}
        </ul>
      {/if}
    {:else}
      {#if listError}
        <p
          role="alert"
          class="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {listError}
        </p>
      {/if}

      {#if showComposer}
        <PromptComposer
          submitLabel="Add prompt"
          onsubmit={handleCreate}
          oncancel={cancelComposer}
        />
      {/if}

      {#if promptStore.count === 0}
        <div
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center"
        >
          <p class="text-sm font-semibold text-foreground">No prompts yet</p>
          <p class="text-xs text-muted-foreground">
            Save the prompts you reuse and they stay one click away on every
            page.
          </p>
          {#if !showComposer}
            <button
              type="button"
              onclick={startCreate}
              class="mt-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              Create your first prompt
            </button>
          {/if}
        </div>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each promptStore.prompts as prompt (prompt.id)}
            {#if editingId === prompt.id}
              <li>
                <PromptComposer
                  initial={toDraft(prompt)}
                  submitLabel="Save changes"
                  onsubmit={handleUpdate}
                  oncancel={cancelComposer}
                />
              </li>
            {:else}
              <PromptCard
                {prompt}
                onedit={() => startEdit(prompt.id)}
                ondelete={() => handleDelete(prompt.id)}
              />
            {/if}
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</section>
