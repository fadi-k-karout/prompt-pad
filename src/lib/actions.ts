/**
 * Runs a callback when Escape is pressed inside the element it is attached to.
 *
 * This is an action rather than a template handler so the keydown listener does
 * not read as an interaction bolted onto a non-interactive element, which
 * svelte-check flags.
 *
 * Deliberately does not call stopPropagation(): Svelte 5 delegates keydown to a
 * single listener on the mount root, so swallowing the event here would cancel
 * it before Svelte's own handlers see it. Escape staying inside the shadow
 * tree is harmless, since it never preventedDefault-ed anything page-visible.
 */
export function onEscape(node: HTMLElement, handler: () => void) {
  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    handler();
  }
  node.addEventListener("keydown", handleKeydown);
  return {
    destroy() {
      node.removeEventListener("keydown", handleKeydown);
    },
  };
}

/**
 * Distance a pointer must travel before the gesture counts as a drag rather
 * than a press. Below this the browser is free to treat the gesture as a click,
 * which is what opens the panel.
 */
const DRAG_THRESHOLD = 4;

/**
 * The half of the position store the gesture needs. Supplied rather than
 * imported so this file stays free of app state, the way `onEscape` takes its
 * handler.
 */
export interface DragTarget {
  begin(): void;
  /** Coordinates arrive in viewport space; the target owns clamping and persistence. */
  place(x: number, y: number, w: number, h: number): void;
  /** `dragged` distinguishes a real move from a plain press, so a click on the pill does not rewrite a position that has not changed. */
  end(dragged: boolean): void | Promise<void>;
}

/**
 * Makes the pill draggable, remembering where it lands.
 *
 * The action lives on the button rather than on its wrapper so that pressing
 * the panel itself can never start a gesture: the two are siblings, and the
 * panel only exists while the pill is hidden.
 *
 * Capturing the pointer is what makes a drag survive leaving the pill -- a
 * down-stroke on the button keeps retargeting to it until release, so the
 * movement is never handed to whatever the cursor passes over. It is also why
 * the trailing click has to be consumed explicitly: with capture, a drag that
 * started and ended over the button still synthesises a click on it, and that
 * click would open the panel the drag just finished rearranging.
 */
export function onDrag(node: HTMLElement, target: DragTarget) {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let baseLeft = 0;
  let baseTop = 0;
  let width = 0;
  let height = 0;
  let moved = false;
  let suppressClick = false;

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || pointerId !== null) return;
    const rect = node.getBoundingClientRect();
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    baseLeft = rect.left;
    baseTop = rect.top;
    width = rect.width;
    height = rect.height;
    moved = false;
    // A press always authorises the click that follows it, so a flag left over
    // from a gesture that ended outside the pill cannot eat the next real tap.
    suppressClick = false;
    target.begin();
    node.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (
      !moved &&
      Math.abs(dx) < DRAG_THRESHOLD &&
      Math.abs(dy) < DRAG_THRESHOLD
    )
      return;
    moved = true;
    target.place(baseLeft + dx, baseTop + dy, width, height);
  }

  function pointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const wasDrag = moved;
    pointerId = null;
    moved = false;
    if (node.hasPointerCapture(event.pointerId))
      node.releasePointerCapture(event.pointerId);
    if (wasDrag) suppressClick = true;
    void target.end(wasDrag);
  }

  function clickCapture(event: MouseEvent) {
    if (!suppressClick) return;
    suppressClick = false;
    // Capture, so the stop lands before the event reaches the mount root where
    // Svelte delegates `click`. Stopping it on the button's way up would work
    // too, but only for bubble; capture covers whichever phase the delegate is
    // registered for.
    event.stopPropagation();
  }

  node.addEventListener("pointerdown", pointerDown);
  node.addEventListener("pointermove", pointerMove);
  node.addEventListener("pointerup", pointerUp);
  node.addEventListener("pointercancel", pointerUp);
  node.addEventListener("click", clickCapture, true);

  return {
    destroy() {
      if (pointerId !== null && node.hasPointerCapture(pointerId))
        node.releasePointerCapture(pointerId);
      node.removeEventListener("pointerdown", pointerDown);
      node.removeEventListener("pointermove", pointerMove);
      node.removeEventListener("pointerup", pointerUp);
      node.removeEventListener("pointercancel", pointerUp);
      node.removeEventListener("click", clickCapture, true);
    },
  };
}
