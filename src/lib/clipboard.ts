/**
 * Copies text to the clipboard from inside a shadow root.
 *
 * Two paths, because neither covers every context a content script runs in:
 *
 * 1. `navigator.clipboard.writeText` is the supported API, but it only exists in
 *    a secure context -- and in a content script `isSecureContext` reflects the
 *    *host page*, so on any `http://` page it is simply absent. It can also
 *    reject when the page has sent `Permissions-Policy: clipboard-write=()`.
 *
 * 2. `document.execCommand('copy')` is deprecated but works on every origin
 *    Extension.js targets. It needs a real text selection inside the document.
 *
 * Both are called synchronously on the click. Awaiting anything before
 * `writeText` can burn the transient user activation Safari requires, which
 * makes the write -- and the fallback that follows it -- fail.
 */

/** Where to put the fallback textarea. Inside the shadow root, so page CSS
 *  cannot restyle it into something visible on the host page. */
function containerFor(anchor?: HTMLElement): Node {
  const root = anchor?.getRootNode();
  // A shadow root for our widget, the document for anything else (options page,
  // or a caller that passed no anchor).
  return root && root instanceof ShadowRoot ? root : document;
}

function copyWithSelection(text: string, container: Node): boolean {
  const host = document.createElement("textarea");
  host.value = text;
  // `display: none` is not enough: a non-rendered textarea copies nothing and
  // execCommand still reports success, so the failure is completely silent.
  host.style.cssText =
    "position: fixed; top: 0; left: 0; width: 1px; height: 1px; padding: 0; " +
    "border: 0; opacity: 0; pointer-events: none; resize: none;";

  // The page's own selection is destroyed by focusing a textarea, so snapshot it
  // and put it back afterwards.
  const selection = document.getSelection();
  const savedRanges: Range[] = [];
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i++) {
      savedRanges.push(selection.getRangeAt(i).cloneRange());
    }
  }

  // Focus from the root, not the document: `document.activeElement` reports the
  // shadow *host* while focus is inside the tree, so restoring from it would
  // strand focus on the host element instead of returning it to the button.
  const root = container instanceof ShadowRoot ? container : null;
  const previous = root ? root.activeElement : document.activeElement;

  try {
    container.appendChild(host);
    host.focus({ preventScroll: true });
    host.select();
    // execCommand only exists on Document -- ShadowRoot has no such method.
    const ok = document.execCommand("copy");
    return ok;
  } catch {
    return false;
  } finally {
    host.remove();

    if (selection && savedRanges.length > 0) {
      selection.removeAllRanges();
      for (const range of savedRanges) {
        try {
          selection.addRange(range);
        } catch {
          // A range whose nodes were torn down mid-copy cannot be restored.
          // Losing the page's selection is a far better outcome than throwing.
        }
      }
    }

    if (previous instanceof HTMLElement) {
      previous.focus({ preventScroll: true });
    }
  }
}

/**
 * Copies `text`, returning whether the clipboard actually took it.
 *
 * Pass `anchor` (the clicked element) so the fallback can live inside the same
 * shadow root. Call it as the first statement of a click handler.
 */
export async function copyText(
  text: string,
  anchor?: HTMLElement,
): Promise<boolean> {
  if (typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through: the host page's Permissions Policy can reject a write that
      // would otherwise have succeeded via execCommand.
    }
  }

  return copyWithSelection(text, containerFor(anchor));
}
