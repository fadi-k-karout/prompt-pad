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
