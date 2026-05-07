# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Wheel Scroll is a browser extension (Manifest V3) that lets users switch browser tabs using Alt+wheel or right-click+wheel. Supports Chrome, Edge, and Firefox. Published on the Chrome Web Store.

## Shell Commands

Never prepend `cd /mnt/c/Users/...` before commands, and never use `git -C "C:/..."` for git commands. The shell is already running at the project root — use commands directly as-is.

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

- **`src/manifest.chrome.json`**, **`src/manifest.edge.json`**, **`src/manifest.firefox.json`** — per-browser MV3 manifests. All require `scripting` and `storage` permissions; `<all_urls>` host permission (with tab restrictions enforced in JS). `src/manifest.json` is gitignored — it is generated at release time by copying the appropriate per-browser file.

## Release

Releases are automated via GitHub Actions (`.github/workflows/release.yml`). Push a tag to trigger:

```bash
git tag v1.2.3
git push origin v1.2.3
```

The workflow builds three zips (one per browser) by copying the matching per-browser manifest to `src/manifest.json`, zipping `src/`, then removing it. A GitHub Release is then created with all three zips attached:
- `tab-wheel-scroll-chrome-<version>.zip`
- `tab-wheel-scroll-edge-<version>.zip`
- `tab-wheel-scroll-firefox-<version>.zip`

## Key Behaviors

- Right-click scroll suppresses the context menu for that interaction by listening for `contextmenu` once and calling `preventDefault`.
- `injectEverywhere()` in the service worker re-injects the content script on extension install/update to cover already-open tabs.
- `getConfigs()` reads sync storage and supplies defaults — call this before any logic that depends on user settings.
- Inaccessible tabs are skipped via `checkTabAvailable()`, which checks the tab URL against a denylist of restricted prefixes.