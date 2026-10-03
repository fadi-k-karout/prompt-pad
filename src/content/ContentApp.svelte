<script lang="ts">
  import { promptStore } from "../lib/storage.svelte.js";
  import PromptList from "../components/PromptList.svelte";

  let isPanelOpen = $state(false);
</script>

{#if isPanelOpen}
  <PromptList onclose={() => (isPanelOpen = false)} />
{:else}
  <button
    type="button"
    onclick={() => (isPanelOpen = true)}
    aria-expanded="false"
    aria-controls="prompt-panel"
    class="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
        d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M5.25 3.75h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
      />
    </svg>
    Prompts
    {#if promptStore.count > 0}
      <span
        class="rounded-full bg-white/20 px-1.5 text-xs tabular-nums"
        aria-label="{promptStore.count} saved"
      >
        {promptStore.count}
      </span>
    {/if}
  </button>
{/if}
