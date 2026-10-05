import { mount } from "svelte";
import "./styles.css";
import OptionsApp from "./OptionsApp.svelte";

console.log("[From the options context] Hello from the options page!");

const container = document.getElementById("app") as HTMLElement | null;

/* Pin this surface to the dark theme. The page's markup paints with fixed
   light-on-dark colors, so following the OS would leave white text on a white
   background; the tokens themselves come from src/styles/theme.css. */
document.documentElement.classList.add("dark");

if (container) {
  mount(OptionsApp, { target: container });
}

export {};
