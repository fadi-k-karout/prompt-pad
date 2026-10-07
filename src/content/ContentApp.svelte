<script lang="ts">
  import { promptStore } from "../lib/storage.svelte.js";
  import { widgetPosition } from "../lib/position.svelte.js";
  import { onDrag, type DragTarget } from "../lib/actions.js";
  import PromptList from "../components/PromptList.svelte";

  /** Mirrors the panel's `w-88` at a 16px root font size; used only until the panel exists to be measured. */
  const PANEL_WIDTH = 352;
  const PANEL_GAP = 12;
  /** Space the pill needs on the side it opens toward, below which it opens the other way. */
  const PANEL_MIN_ROOM = 240;
  const PANEL_EDGE = 8;
  /** Matches the 70vh cap the panel had while it was pinned to the bottom edge. */
  const PANEL_VH_CAP = 0.7;

  interface PanelMeta {
    /** Whether the panel hangs below the pill rather than above it. */
    down: boolean;
    /** The panel's left edge, as an offset from the pill's left edge. */
    left: number;
    maxH: number;
  }

  let isPanelOpen = $state(false);

  // Element and dimension bindings (Svelte automatically tracks reactivity for these)
  let dockEl = $state<HTMLElement | null>(null);
  let panelEl = $state<HTMLElement | null>(null);
  let panelWidth = $state(0);

  /**
   * The coordinate box's origin in viewport space.
   */
  let origin = $state({ x: 0, y: 0 });

  const dockLabel = $derived(
    promptStore.count > 0 ? `Prompts, ${promptStore.count} saved` : "Prompts",
  );

  /**
   * The panel's real width, falling back to a safe layout estimate before it exists.
   */
  const actualPanelWidth = $derived(
    panelWidth > 0
      ? panelWidth
      : Math.min(PANEL_WIDTH, window.innerWidth * 0.92),
  );

  /**
   * Automatically derives the panel's positioning metadata whenever the panel opens,
   * resizes, or the viewport coordinates change.
   */
  const panelMeta = $derived.by<PanelMeta>(() => {
    // Re-run whenever the viewport dimensions track changes
    void widgetPosition.vw;
    void widgetPosition.vh;

    const vh = window.innerHeight;
    const defaultMeta: PanelMeta = {
      down: false,
      left: 0,
      maxH: Math.round(vh * PANEL_VH_CAP),
    };

    if (!isPanelOpen || !dockEl) return defaultMeta;

    const rect = dockEl.getBoundingClientRect();
    const vw = window.innerWidth;

    const roomAbove = rect.top - PANEL_GAP - PANEL_EDGE;
    const roomBelow = vh - rect.bottom - PANEL_GAP - PANEL_EDGE;

    // Determine if the panel opens upward or downward
    const down = roomBelow > roomAbove && roomAbove < PANEL_MIN_ROOM;

    // Calculate left horizontal offset relative to the pill
    let viewportLeft = rect.right - actualPanelWidth;
    if (viewportLeft < PANEL_EDGE) viewportLeft = rect.left;
    viewportLeft = Math.min(
      Math.max(viewportLeft, PANEL_EDGE),
      Math.max(PANEL_EDGE, vw - PANEL_EDGE - actualPanelWidth),
    );

    const room = down ? roomBelow : roomAbove;
    return {
      down,
      left: viewportLeft - rect.left,
      maxH: Math.max(0, Math.min(room, vh * PANEL_VH_CAP)),
    };
  });

  const dragTarget: DragTarget = {
    begin: () => widgetPosition.beginDrag(),
    place: (x, y, w, h) => widgetPosition.place(x, y, w, h),
    end: (dragged) => widgetPosition.endDrag(dragged),
  };

  function openPanel() {
    isPanelOpen = true;
  }

  // Updates the origin point based on layout transformations
  $effect(() => {
    if (!dockEl) return;
    void widgetPosition.vw;
    void widgetPosition.vh;

    const box = dockEl.parentElement;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    origin = { x: rect.left, y: rect.top };
  });
</script>

<div
  class="pp-dock"
  class:invisible={!widgetPosition.isReady}
  data-placed={widgetPosition.isPlaced ? "free" : "docked"}
  data-dir={widgetPosition.dockSide}
  data-open={panelMeta.down ? "down" : "up"}
  style:left={widgetPosition.isPlaced
    ? `${widgetPosition.x - origin.x}px`
    : undefined}
  style:top={widgetPosition.isPlaced
    ? `${widgetPosition.y - origin.y}px`
    : undefined}
  style:--panel-left={`${panelMeta.left}px`}
  style:--panel-max-h={`${panelMeta.maxH}px`}
  bind:this={dockEl}
>
  <button
    type="button"
    class="pill flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-badge hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    class:invisible={isPanelOpen}
    use:onDrag={dragTarget}
    onclick={openPanel}
    aria-expanded={isPanelOpen}
    aria-controls="prompt-panel"
    aria-label={dockLabel}
    title={dockLabel}
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
    <span class="pill-label">Prompts</span>
    {#if promptStore.count > 0}
      <span
        class="pill-count rounded-full bg-primary-foreground/20 px-1.5 text-xs tabular-nums"
      >
        {promptStore.count}
      </span>
    {/if}
  </button>

  {#if isPanelOpen}
    <PromptList onclose={() => (isPanelOpen = false)} />
  {/if}
</div>
