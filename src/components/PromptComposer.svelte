<script lang="ts">
  import { untrack } from "svelte";
  import type { PromptDraft } from "../lib/types.js";
  import { parseTags } from "../lib/format.js";
  import { onEscape } from "../lib/actions.js";

  interface Props {
    initial?: PromptDraft;
    submitLabel: string;
    onsubmit: (draft: PromptDraft) => Promise<void>;
    oncancel: () => void;
  }

  let { initial, submitLabel, onsubmit, oncancel }: Props = $props();

  // Seeding once is deliberate: the list remounts the composer per prompt, so
  // switching prompts builds fresh state instead of clobbering an open draft.
  const seed = untrack(() => initial);

  let title = $state(seed?.title ?? "");
  let content = $state(seed?.content ?? "");
  let tagsInput = $state(seed?.tags.join(", ") ?? "");
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  const canSubmit = $derived(
    title.trim().length > 0 && content.trim().length > 0 && !isSaving,
  );

  // The composer is mounted on demand rather than parsed with the page, so
  // autofocus is applied in an action instead of via the attribute.
  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    isSaving = true;
    error = null;
    try {
      await onsubmit({
        title: title.trim(),
        content: content.trim(),
        tags: parseTags(tagsInput),
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not save the prompt.";
    } finally {
      isSaving = false;
    }
  }

  const fieldClass =
    "w-full border border-gray-300 rounded-lg bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
</script>

<form
  class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
  aria-busy={isSaving}
  use:onEscape={oncancel}
  onsubmit={handleSubmit}
>
  <div class="flex flex-col gap-1">
    <label for="composer-title" class="text-xs font-semibold text-gray-700">
      Title
      <!-- Colour alone is not the signal, and a screen reader announcing
           "asterisk" is noise, so the star is decorative and `required` below
           carries the meaning. -->
      <span class="text-red-600" aria-hidden="true">*</span>
    </label>
    <input
      id="composer-title"
      type="text"
      bind:value={title}
      use:focusOnMount
      placeholder="Summarize a meeting transcript"
      maxlength="120"
      required
      class={fieldClass}
    />
  </div>

  <div class="flex flex-col gap-1">
    <label for="composer-content" class="text-xs font-semibold text-gray-700">
      Prompt
      <span class="text-red-600" aria-hidden="true">*</span>
    </label>
    <textarea
      id="composer-content"
      bind:value={content}
      rows="4"
      placeholder="You are a helpful assistant that…"
      required
      class="{fieldClass} resize-y"></textarea>
  </div>

  <div class="flex flex-col gap-1">
    <label for="composer-tags" class="text-xs font-semibold text-gray-700">
      Tags <span class="font-normal text-gray-500"
        >(optional, comma separated)</span
      >
    </label>
    <input
      id="composer-tags"
      type="text"
      bind:value={tagsInput}
      placeholder="writing, research"
      class={fieldClass}
    />
  </div>

  {#if error}
    <p role="alert" class="text-xs font-medium text-red-600">{error}</p>
  {/if}

  <div class="flex items-center justify-end gap-2">
    <button
      type="button"
      onclick={oncancel}
      disabled={isSaving}
      class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!canSubmit}
      class="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
    >
      {isSaving ? "Saving…" : submitLabel}
    </button>
  </div>
</form>
