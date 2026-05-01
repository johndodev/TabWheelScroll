# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Wheel Scroll is a Chrome extension (Manifest V3) that lets users switch browser tabs using Alt+wheel or right-click+wheel. Published on the Chrome Web Store.

## Development

No build step, no test framework, no linter. Edit files directly — changes take effect after reloading the extension in Chrome.

**Loading locally:**
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → select the project root

## Architecture

The extension follows the standard MV3 content script + service worker pattern:

- **`src/main.js`** (content script) — runs on every page at document start. Listens for `wheel` events, detects Alt+wheel and right-click+wheel combinations, then sends `'up'` or `'down'` messages via `chrome.runtime.sendMessage`.

- **`src/js/service-worker.js`** (background) — receives messages from the content script, queries tabs in the current window, and calls `chrome.tabs.update` to activate the next/previous tab. Handles cyclic wrapping, skips inaccessible tabs (`chrome://`, `about:*`, restricted pages), and suppresses the context menu after a right-click scroll.

- **`src/popup.html` + `src/popup.js`** — settings UI with one user-configurable option: cyclic tab switching. Reads/writes to `chrome.storage.sync`.

- **`src/manifest.json`** — MV3 manifest. Requires `scripting` and `storage` permissions; `<all_urls>` host permission (with tab restrictions enforced in JS).

## Key Behaviors

- Right-click scroll suppresses the context menu for that interaction by listening for `contextmenu` once and calling `preventDefault`.
- `injectEverywhere()` in the service worker re-injects the content script on extension install/update to cover already-open tabs.
- `getConfigs()` reads sync storage and supplies defaults — call this before any logic that depends on user settings.
- Inaccessible tabs are skipped via `checkTabAvailable()`, which checks the tab URL against a denylist of restricted prefixes.