import { mount, unmount } from "svelte";
import ContentApp from "./ContentApp.svelte";
import "./styles.css";

console.log("[From the page context] Hello from content_scripts!");

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
  document.body.appendChild(rootDiv);
  const shadowRoot = rootDiv.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  shadowRoot.appendChild(styleElement);

  fetchCSS().then((response) => (styleElement.textContent = response));

  // Create container for Svelte app
  const contentDiv = document.createElement("div");
  contentDiv.className = "content_script";
  shadowRoot.appendChild(contentDiv);

  // Mount Svelte app using Svelte 5's mount function
  const app = mount(ContentApp, {
    target: contentDiv,
  });

  // A shadow root does not stop events from reaching the host page: they are
  // retargeted to the host element and keep bubbling, so the page's own
  // document- and window-level listeners still see every click on the widget
  // and will close menus or dismiss modals underneath it.
  //
  // This has to happen on contentDiv, which is the last node inside the shadow
  // tree, rather than on individual components. Svelte 5 delegates `click` to
  // a single listener on the mount root, so a stopPropagation() anywhere below
  // that root cancels the event before Svelte's handler ever runs and the
  // widget silently stops responding. On the root itself it is safe: a
  // stopPropagation() does not suppress other listeners on the same element, so
  // Svelte still receives the click while the host page never does.
  // mousedown is covered too, since host-page dropdowns and date pickers
  // usually act on mousedown rather than click.
  contentDiv.addEventListener("click", swallow);
  contentDiv.addEventListener("mousedown", swallow);

  function swallow(event: Event) {
    event.stopPropagation();
  }

  return () => {
    contentDiv.removeEventListener("click", swallow);
    contentDiv.removeEventListener("mousedown", swallow);
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
