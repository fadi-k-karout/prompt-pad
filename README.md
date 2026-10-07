<a href="https://extension.js.org" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Powered%20by%20%7C%20Extension.js-0971fe" alt="Powered by Extension.js" align="right" /></a>

# prompt-pad

> Prompt Pad is a browser extension that lets you save, organize, and quickly reuse your favorite prompts in a floating panel on any webpage.

## Features

- **Floating prompt panel**: Access your saved prompts from any webpage with a single click.
- **Dockable launch pill**: Sits 16px off the bottom-right corner, mirrors to the bottom-left on right-to-left pages, and can be dragged anywhere. The position is remembered across pages, tabs, and browser sessions, and drops to an icon on screens narrower than 480px.
- **Create, edit, and delete prompts**: Organize your prompts with titles, content, and tags.
- **Template builder**: Draft a prompt from one of ten built-in patterns — persona, few-shot, chain-of-thought, guardrails and more. Fill the fields, watch the prompt assemble live, then save it.
- **Copy to clipboard**: Copy any saved prompt with one click.
- **Search and filter**: Find prompts quickly by searching titles, content, or tags.
- **Syncs locally**: Your prompts are stored in your browser's local storage.

## Commands

### dev

Run the extension in development mode. Target a browser with `--browser`:

```bash
pnpm run dev
pnpm run dev -- --browser=firefox
pnpm run dev -- --browser=edge
```

### build

Build for production. Convenience scripts target each browser:

```bash
pnpm run build           # Chromium (default)
pnpm run build:firefox
pnpm run build:edge
```

### preview

Preview the production build in the browser:

```bash
pnpm run preview
```

## Learn more

[Extension.js docs](https://extension.js.org).
