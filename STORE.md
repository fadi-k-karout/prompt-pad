# Store metadata

Last updated: 2026-10-06

## Listing

- Name: prompt-pad
- Summary: Save, organize, and quickly reuse your favorite prompts in a floating panel on any webpage.
- Description: Prompt Pad is a browser extension that lets you save, organize, and quickly reuse your favorite prompts. With a floating panel accessible from any webpage, you can create, edit, search, and copy prompts to your clipboard with just a click. Keep all your go-to prompts at your fingertips while working with AI tools.
- Category: Productivity
- Screenshots: TODO at least one 1280x800 screenshot per store.

## Privacy and data use

- Prompt Pad stores all prompts and data locally in your browser's storage. No data is collected, transmitted, or shared with any third party.
- The position the user drags the launch pill to is stored locally as well. It is a viewport coordinate and a page size, nothing else; no page content, URL or prompt text travels with it.
- The template builder assembles prompt text entirely on the device. It sends nothing anywhere and never contacts a model provider.
- The manifest declares data_collection_permissions: none for Firefox, which matches this behavior.
- Privacy policy URL: TODO required by every store once you collect any data (not applicable if no data is collected).

## Chrome Web Store

### Single purpose

Save, organize, and quickly reuse your favorite prompts in a floating panel on any webpage.

### Permissions justification

- Content script match <all_urls>: The content script runs on the pages the user visits to render the floating prompt panel. This is necessary for the extension's core functionality.
- storage: Stores prompts locally in the browser so they persist across sessions, along with the position of the launch pill.
- clipboardWrite: Allows copying prompts to the clipboard when requested by the user.

## Firefox Add-ons

### Reviewer notes

TODO steps a reviewer needs to exercise the extension. Start by opening any webpage: a "Prompts" pill sits 16px off the bottom-right corner. Click it to open the panel. Test creating, editing, searching, and copying prompts. Then drag the pill somewhere else and reload the page -- it comes back where you left it, on every page and in a second tab. Drag it close to the top edge and open the panel again: it opens downward when there is no room above it. The build is bundled; include build-from-source instructions: pnpm install, then pnpm run build. The dist output matches the upload.

### Release notes

- Save, organize, and reuse prompts in a floating panel on any webpage, and draft new prompts from built-in templates.
- The launch pill docks 16px off the bottom-right corner, mirrors to the bottom-left on right-to-left pages, and can be dragged anywhere. Its position is remembered across pages, tabs, and browser sessions.
- On a screen narrower than 480px the pill drops its label and becomes icon-only.

## Edge Add-ons

### Certification notes

TODO anything the certification team needs to test the extension. Mirrors the Firefox reviewer notes in most cases.

## Version history

- 1.0.0 (unreleased): initial release of prompt-pad. Save, organize, and reuse prompts in a floating panel on any webpage, draft new prompts from built-in templates, and drag the launch pill anywhere you like -- it remembers where it was put.
