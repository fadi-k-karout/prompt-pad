import type { StorageSchema, WidgetPosition } from "./types";

const POSITION_KEY = "widgetPosition";

/** Closest the pill may be dragged to a viewport edge. Below the 16px dock inset, so the user can pull it tighter than the default but never off-screen. */
const EDGE_MARGIN = 8;

function clamp(value: number, size: number, span: number): number {
  return Math.min(
    Math.max(value, EDGE_MARGIN),
    Math.max(EDGE_MARGIN, span - size - EDGE_MARGIN),
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Storage is not type-checked at runtime, so anything read back is untrusted:
 * a hand-edited entry, a partial write from an older version, or a value that
 * was never ours at all.
 */
function isWidgetPosition(value: unknown): value is WidgetPosition {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    isFiniteNumber(r.x) &&
    isFiniteNumber(r.y) &&
    isFiniteNumber(r.w) &&
    isFiniteNumber(r.h) &&
    isFiniteNumber(r.vw) &&
    isFiniteNumber(r.vh)
  );
}

/**
 * Which physical corner the docked default sits in, mirroring the page's own
 * writing direction.
 *
 * Logical properties cannot do this here: `all: initial !important` on the host
 * forces `direction: ltr` on the whole shadow tree, so `inset-inline-end`
 * would resolve to `right` even on an Arabic page. The direction is read from
 * the document instead and carried as an attribute, which also keeps the
 * pill's own flex order -- icon then label -- from mirroring along with it.
 */
function readDockSide(): "start" | "end" {
  const direction = getComputedStyle(document.documentElement).direction;
  return direction === "rtl" ? "start" : "end";
}

class WidgetPositionStore {
  /** The one storage read has settled. The pill stays hidden until then, since there is no synchronous way to learn where it belongs and painting at the default first would snap it across the page a frame later. */
  isReady = $state(false);
  /** The pill has been dragged once, so the free coordinates below override the docked default. */
  isPlaced = $state(false);
  isDragging = $state(false);
  dockSide = $state<"start" | "end">("end");

  /** Viewport-space coordinates of the pill's top-left corner. */
  x = $state(0);
  y = $state(0);

  /** Kept reactive so dependents (panel sizing) recompute on resize rather than reading a stale snapshot. */
  vw = $state(0);
  vh = $state(0);

  /** Pill dimensions from the last place or load, used to clamp without a DOM read. */
  private w = 0;
  private h = 0;
  private watching = false;
  private resizeFrame = 0;

  constructor() {
    this.dockSide = readDockSide();
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    void this.load();
    this.watch();
    window.addEventListener("resize", this.onResize);
  }

  private async load(): Promise<void> {
    try {
      const result = (await chrome.storage.local.get(
        POSITION_KEY,
      )) as Partial<StorageSchema>;
      const saved = result.widgetPosition;
      if (isWidgetPosition(saved)) {
        this.w = saved.w;
        this.h = saved.h;
        this.x = clamp(saved.x, saved.w, window.innerWidth);
        this.y = clamp(saved.y, saved.h, window.innerHeight);
        this.isPlaced = true;
      }
    } catch (err) {
      console.error("Failed to load the widget position: ", err);
    } finally {
      // Reveal either way. Waiting on a retry would leave the pill invisible
      // for as long as storage is failing, and the docked default is a
      // perfectly good place to be while a saved position is unavailable.
      this.isReady = true;
    }
  }

  /**
   * The prompt store registers its own listener against `prompts` and returns
   * early for every other key, so this needs to be a second listener rather
   * than an addition to that one.
   */
  private watch(): void {
    if (this.watching) return;
    this.watching = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[POSITION_KEY]) return;
      // A drag owns the position until it ends. Adopting the echo of this
      // tab's own write, or a write from a second tab, would yank the pill out
      // from under the pointer mid-drag.
      if (this.isDragging) return;
      const next = changes[POSITION_KEY].newValue;
      if (!isWidgetPosition(next)) return;
      this.w = next.w;
      this.h = next.h;
      this.x = clamp(next.x, next.w, window.innerWidth);
      this.y = clamp(next.y, next.h, window.innerHeight);
      this.isPlaced = true;
    });
  }

  private onResize = (): void => {
    if (this.resizeFrame) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.vw = window.innerWidth;
      this.vh = window.innerHeight;
      if (!this.isPlaced || this.isDragging) return;
      this.x = clamp(this.x, this.w, this.vw);
      this.y = clamp(this.y, this.h, this.vh);
    });
  };

  /** Records a dragged position, clamped against the live viewport. Coordinates arrive in viewport space; the caller converts to the coordinate box on write. */
  place(vx: number, vy: number, w: number, h: number): void {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.w = w;
    this.h = h;
    this.x = clamp(vx, w, this.vw);
    this.y = clamp(vy, h, this.vh);
    this.isPlaced = true;
  }

  beginDrag(): void {
    this.isDragging = true;
  }

  /**
   * Writes on pointerup only, and only when the gesture actually moved the
   * pill: a write per pointermove would flood storage with a value that changes
   * every frame and is meaningless until the gesture ends, and a plain click
   * has nothing to record.
   */
  async endDrag(dragged: boolean): Promise<void> {
    this.isDragging = false;
    if (!dragged || !this.isPlaced) return;
    const saved: WidgetPosition = {
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      vw: this.vw,
      vh: this.vh,
    };
    try {
      await chrome.storage.local.set({ [POSITION_KEY]: saved });
    } catch (err) {
      console.error("Failed to save the widget position: ", err);
    }
  }
}

export const widgetPosition = new WidgetPositionStore();
