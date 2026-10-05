<script lang="ts">
  import { listPatterns, resolveVariables } from "../lib/promptPatterns.js";

  interface Props {
    onselect: (id: string) => void;
    oncancel: () => void;
  }

  let { onselect, oncancel }: Props = $props();

  // Resolving variables per pattern here rather than in the template keeps the
  // count on each row consistent with the fields the next step will actually
  // show, including the ones deduped out of a repeated slot.
  const patterns = listPatterns().map(({ id, pattern }) => ({
    id,
    name: pattern.name,
    description: pattern.description,
    variableCount: resolveVariables(pattern).length,
  }));
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <h3 class="text-sm font-semibold text-foreground">Choose a template</h3>
      <p class="mt-0.5 text-xs text-muted-foreground">
        Fill in a few fields and the prompt is written for you.
      </p>
    </div>
    <button
      type="button"
      onclick={oncancel}
      aria-label="Back to prompts"
      class="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
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
  </div>

  <ul class="flex flex-col gap-2">
    {#each patterns as pattern (pattern.id)}
      <li>
        <button
          type="button"
          onclick={() => onselect(pattern.id)}
          class="flex w-full flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-input hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <span class="flex items-baseline justify-between gap-2">
            <span class="text-sm font-semibold text-card-foreground">
              {pattern.name}
            </span>
            <span
              class="shrink-0 text-xs text-muted-foreground tabular-nums"
              aria-label="{pattern.variableCount} fields to fill"
            >
              {pattern.variableCount}
              {pattern.variableCount === 1 ? "field" : "fields"}
            </span>
          </span>
          <span class="text-xs text-muted-foreground">
            {pattern.description}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</div>
