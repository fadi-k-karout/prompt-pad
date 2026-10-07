<script lang="ts">
  import { promptStore } from "../lib/storage.svelte.js";
  import { PROMPT_PATTERNS } from "../lib/promptPatterns.js";
  import type { Prompt, PromptDraft } from "../lib/types.js";
  import { onEscape } from "../lib/actions.js";
  import PromptCard from "./PromptCard.svelte";
  import PromptComposer from "./PromptComposer.svelte";
  import PatternPicker from "./PatternPicker.svelte";
  import PatternForm from "./PatternForm.svelte";

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();

  let showComposer = $state(false);
  let editingId = $state<string | null>(null);
  let listError = $state<string | null>(null);
  let pickerOpen = $state(false);
  let activePatternId = $state<string | null>(null);
  // What the composer is seeded with when it opens off the back of a pattern.
  // Null means "open blank", so the two paths share one composer.
  let seedDraft = $state<PromptDraft | null>(null);
  // Kept separately because usePattern clears the id it came from, and the
  // composer wants to name the template it was drafted from.
  let seedPatternName = $state<string | null>(null);

  const isEditing = $derived(editingId !== null);
  // No pattern can have an empty id, so this doubles as "the form is open" and
  // keeps the id non-null for both the template and the lookup in usePattern.
  const formPatternId = $derived(activePatternId ?? "");
  // Anything layered over the list. The header buttons disable on this so Add
  // and Templates can never both be open at once.
  const isLayered = $derived(
    showComposer || isEditing || pickerOpen || formPatternId !== "",
  );

  // The prompt being edited can disappear while its composer is open -- deleted
  // here, or synced in from a second tab. The composer then leaves with it, and
  // clearing the id here is what re-enables Add, instead of stranding the panel
  // until the next Escape.
  $effect(() => {
    if (editingId && !promptStore.getById(editingId)) editingId = null;
  });

  /** Drops the template seed, so the next composer opens blank. */
  function clearSeed() {
    seedDraft = null;
    seedPatternName = null;
  }

  function toDraft(prompt: Prompt): PromptDraft {
    return { title: prompt.title, content: prompt.content, tags: prompt.tags };
  }

  function startCreate() {
    // Saving before the first read lands would write a one-prompt list over
    // whatever is already stored, so creation waits for a loaded list.
    if (!promptStore.isLoaded) return;
    editingId = null;
    clearSeed();
    pickerOpen = false;
    activePatternId = null;
    showComposer = true;
  }

  function startEdit(id: string) {
    pickerOpen = false;
    activePatternId = null;
    clearSeed();
    showComposer = false;
    editingId = id;
  }

  function cancelComposer() {
    showComposer = false;
    editingId = null;
    clearSeed();
  }

  function startPicker() {
    showComposer = false;
    editingId = null;
    clearSeed();
    activePatternId = null;
    pickerOpen = true;
  }

  function selectPattern(id: string) {
    activePatternId = id;
    pickerOpen = false;
  }

  /**
   * Backing out of the pattern form returns to the picker, not the list: the
   * picker is where the pattern was chosen, so that is the place to choose
   * another from.
   */
  function cancelPattern() {
    activePatternId = null;
    pickerOpen = true;
  }

  function cancelPicker() {
    pickerOpen = false;
    activePatternId = null;
  }

  /**
   * Turns a rendered pattern into a composer seed rather than a saved prompt, so
   * the result stays an ordinary prompt the user can retitle and re-edit.
   */
  function createPrompt(content: string) {
    const pattern = PROMPT_PATTERNS[formPatternId];
    if (!pattern) return;
    activePatternId = null;
    seedDraft = { title: pattern.name, content, tags: [] };
    seedPatternName = pattern.name;
    showComposer = true;
  }

  async function handleCreate(draft: PromptDraft) {
    await promptStore.add(draft);
    showComposer = false;
    clearSeed();
  }

  async function handleUpdate(draft: PromptDraft) {
    if (!editingId) return;
    await promptStore.update(editingId, draft);
    editingId = null;
    clearSeed();
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

  /**
   * Escape backs out one layer at a time, so a stray keypress does not discard
   * a half-written prompt along with the panel: pattern form -> picker ->
   * composer -> panel.
   *
   * This is the only Escape handler in the subtree. `onEscape` deliberately
   * leaves propagation alone (Svelte 5 delegates keydown to one root listener),
   * so a child form that also registered would fire alongside this one and
   * collapse the whole ladder on a single press.
   */
  function handleEscape() {
    if (formPatternId) {
      cancelPattern();
      return;
    }
    if (pickerOpen) {
      cancelPicker();
      return;
    }
    if (showComposer || isEditing) {
      cancelComposer();
      return;
    }
    onclose();
  }
</script>

<section
  id="prompt-panel"
  class="flex w-88 max-w-[min(22rem,92vw)] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
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
        disabled={isLayered || !promptStore.isLoaded}
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
        onclick={startPicker}
        disabled={isLayered || !promptStore.isLoaded}
        class="flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
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
            d="M6.75 3.75h10.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5ZM9 3.75V2.25h6v1.5m-6 5.25h6m-6 4.5h4.5"
          />
        </svg>
        Templates
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
    <!-- 1. CRITICAL ERROR: Failed to Load Store -->
    {#if !promptStore.isLoaded && promptStore.loadError}
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

      <!-- 2. LOADING STATE: Skeleton Screen -->
    {:else}
      <!-- 4. ACTIVE ACTIONS: Forms, Composers, and Pickers -->
      {#if formPatternId}
        <PatternForm
          patternId={formPatternId}
          oncreate={createPrompt}
          oncancel={cancelPattern}
        />
      {:else if pickerOpen}
        <PatternPicker onselect={selectPattern} oncancel={cancelPicker} />
      {:else if showComposer}
        <PromptComposer
          initial={seedDraft ?? undefined}
          sourceLabel={seedPatternName ?? undefined}
          submitLabel={seedDraft ? "Save prompt" : "Add prompt"}
          onsubmit={handleCreate}
          oncancel={cancelComposer}
        />
      {/if}

      <!-- 5. EMPTY STATE: No items yet -->
      {#if promptStore.count === 0 && !formPatternId && !pickerOpen}
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

        <!-- 6. CONTENT STATE: Main Prompt List -->
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
