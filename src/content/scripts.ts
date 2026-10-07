import { mount, unmount } from "svelte";
import ContentApp from "./ContentApp.svelte";
import "./styles.css";

console.log("[From the page context] Hello from content_scripts!");

/** Every gesture whose bubbling the host page must not observe. Deliberately includes `mousemove` and the hover pair: a widget parked over a page's content is not part of the page's own cursor state. */
const PAGE_GESTURES = [
  "click",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "mousemove",
  "mouseover",
  "mouseout",
  "touchstart",
  "touchmove",
  "touchend",
] as const;

/**
 * Extension.js content_script entrypoint. The framework calls this on
 * injection and calls the returned function on HMR/teardown to clean up.
 * Do not invoke it yourself.
 */
export default function initial() {
  const rootDiv = document.createElement("div");
  rootDiv.setAttribute("data-extension-root", "true");
  // Isolate the host from page styles (e.g. example.com ships div{opacity:.8},
  // which would otherwise fade the whole widget): the shadow DOM only protects
  // descendants, and the host element itself still takes page CSS.
  rootDiv.style.cssText = "all: initial !important";
  // Anchor on <html>, not <body>: the manifest injects at document_start,
  // which fires once <html> exists but before <body> does. Hosting the root on
  // <html> also keeps it out of the way if the page puts `transform` on <body>
  // -- that would turn <body> into the containing block for our fixed-position
  // viewport box.
  document.documentElement.appendChild(rootDiv);
  const shadowRoot = rootDiv.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  shadowRoot.appendChild(styleElement);

  // Create container for Svelte app
  const contentDiv = document.createElement("div");
  contentDiv.className = "content_script";
  // Two things that must be true before styles.css lands rather than after it.
  //
  // The geometry, because ContentApp measures this box on mount to learn the
  // coordinate system it writes `left`/`top` in: until the stylesheet is parsed
  // the `.content_script` rule in styles.css has not applied, so the box would
  // still be `position: static` in the host page's flow -- in flow with the
  // page's own content -- and a measurement taken then reports the page's
  // layout rather than the viewport. Every remembered position would be written
  // that far off, and only a resize (which re-runs the effect) would bring the
  // pill back. Duplicated here on purpose; the rule in styles.css is the
  // documented one.
  //
  // The visibility, because without `.pill`'s rules the widget paints as an
  // unstyled button with an intrinsic-sized SVG: that is the sub-second flash
  // on launch. Revealing in the same turn the stylesheet is applied means there
  // is no frame in between, and `.pp-dock`'s reveal gate takes over from there.
  contentDiv.style.cssText =
    "position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; visibility: hidden";
  shadowRoot.appendChild(contentDiv);

  const reveal = () => (contentDiv.style.visibility = "");

  fetchCSS().then(
    (response) => {
      styleElement.textContent = response;
      reveal();
    },
    (err: unknown) => {
      console.error("Failed to load the overlay styles: ", err);
      // Reveal even without styles: the inline `pointer-events: none` above
      // already keeps the viewport-sized box from swallowing the page's clicks,
      // and a widget that is silently absent is harder to diagnose than an
      // unstyled one.
      reveal();
    },
  );

  // Mount Svelte app using Svelte 5's mount function
  const app = mount(ContentApp, {
    target: contentDiv,
  });

  // A shadow root does not stop events from reaching the host page: they are
  // retargeted to the host element and keep bubbling, so the page's own
  // document- and window-level listeners still see every gesture that starts
  // on the widget and will close menus, dismiss modals or move their own
  // cursor-driven UI in response to it.
  //
  // This has to happen on contentDiv, which is the last node inside the shadow
  // tree, rather than on individual components. Svelte 5 delegates `click` to
  // a single listener on the mount root, so a stopPropagation() anywhere below
  // that root cancels the event before Svelte's handler ever runs and the
  // widget silently stops responding. On the root itself it is safe: a
  // stopPropagation() does not suppress other listeners on the same element, so
  // Svelte still receives the gesture while the host page never does.
  //
  // The whole pointer/mouse/touch set is swallowed rather than just `click` and
  // `mousedown`, because the pill is now draggable: leaving `pointermove` alone
  // would hand the page a stream of movement while the pill is being dragged
  // across it, and leaving the hover events alone would let the widget close
  // whatever the page opens on mouseover.
  //
  // Nothing here calls preventDefault(): focus still has to land on the pill
  // from a click, text in the panel still has to be selectable, and a textarea
  // still has to be able to start a drag of its own contents.
  for (const type of PAGE_GESTURES) {
    contentDiv.addEventListener(type, swallow);
  }

  function swallow(event: Event) {
    event.stopPropagation();
  }

  return () => {
    for (const type of PAGE_GESTURES) {
      contentDiv.removeEventListener(type, swallow);
    }
    unmount(app);
    rootDiv.remove();
  };
}

async function fetchCSS() {
  const cssUrl = new URL("./styles.css", import.meta.url);
  const response = await fetch(cssUrl);
  const text = await response.text();

  return response.ok ? text : Promise.reject(text);
}
