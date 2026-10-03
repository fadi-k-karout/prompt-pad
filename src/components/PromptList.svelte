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

  function toDraft(prompt: Prompt): PromptDraft {
    return { title: prompt.title, content: prompt.content, tags: prompt.tags };
  }

  function startCreate() {
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
  class="flex max-h-[70vh] w-88 max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl"
  aria-label="Prompts"
  use:onEscape={handleEscape}
>
  <header
    class="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3"
  >
    <h2 class="flex items-baseline gap-2 text-sm font-semibold">
      Prompts
      {#if promptStore.isLoaded}
        <span class="text-xs font-normal text-gray-400">
          {promptStore.count}
        </span>
      {/if}
    </h2>

    <span class="flex items-center gap-1">
      <button
        type="button"
        onclick={startCreate}
        disabled={showComposer || isEditing}
        class="flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
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
        class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
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
      <ul class="flex flex-col gap-2">
        {#each Array(3) as _, index (index)}
          <li
            class="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          ></li>
        {/each}
      </ul>
    {:else}
      {#if listError}
        <p
          role="alert"
          class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
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
          class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center"
        >
          <p class="text-sm font-semibold text-gray-700">No prompts yet</p>
          <p class="text-xs text-gray-500">
            Save the prompts you reuse and they stay one click away on every
            page.
          </p>
          {#if !showComposer}
            <button
              type="button"
              onclick={startCreate}
              class="mt-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
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
