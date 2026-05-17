# Reverse Scroll Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a popup toggle that inverts which wheel direction selects the next vs. previous tab.

**Architecture:** New boolean preference `reverseScrollDirection` in `chrome.storage.sync` (default `false`). The content script (`src/main.js`) reads the preference, listens for changes, and applies inversion via XOR before sending the `'up'`/`'down'` message. The service worker is unchanged — the message contract is preserved.

**Tech Stack:** Vanilla JS, Chrome Extension MV3 APIs (`chrome.storage.sync`, `chrome.runtime`).

**Testing note:** This project has no test framework (per `CLAUDE.md`). Verification is by manually reloading the unpacked extension in Chrome and exercising the feature.

**Spec:** `docs/superpowers/specs/2026-05-17-reverse-scroll-direction-design.md`

---

## File Structure

- **Modify:** `src/popup.html` — add one new checkbox row in the *Behavior* section.
- **Modify:** `src/main.js` — track a new `reverseEnabled` variable; read from storage on startup; update on `storage.onChanged`; apply XOR when computing `direction`.
- **No change:** `src/popup.js` — the generic `form.elements` loop already loads and persists any named checkbox to `chrome.storage.sync`.
- **No change:** `src/js/service-worker.js` — the `'up'`/`'down'` message contract is preserved.

---

### Task 1: Add the popup checkbox

**Files:**
- Modify: `src/popup.html` (insert new `<label class="option">` block after the existing *Cyclic tab switching* option, i.e. after line 124 — the closing `</label>` of that block)

- [ ] **Step 1: Add the checkbox markup**

Insert this block in `src/popup.html` immediately after the closing `</label>` of the *Cyclic tab switching* option (the block whose input name is `cyclicSwitchTab`), and before the closing `</form>`:

```html
<label class="option">
    <input type="checkbox" name="reverseScrollDirection" />
    <div class="option-text">
        <span class="option-label">Reverse scroll direction</span>
        <span class="option-desc">Scroll up to go to the next tab, scroll down to go to the previous tab.</span>
    </div>
</label>
```

- [ ] **Step 2: Manually verify popup renders**

1. Open `chrome://extensions/`, enable Developer mode, click *Load unpacked* and select the project root (or click the reload icon if already loaded).
2. Open the extension popup.
3. Expected: a new *Reverse scroll direction* row appears under *Cyclic tab switching*, with the same styling. The checkbox is unchecked by default.
4. Toggle it on, close and reopen the popup. Expected: checkbox remains checked (persistence via the existing `popup.js` form handler).
5. Toggle it off again before moving on, so subsequent steps start from the default state.

- [ ] **Step 3: Commit**

```bash
git add src/popup.html
git commit -m "popup: add reverse scroll direction checkbox"
```

---

### Task 2: Apply the preference in the content script

**Files:**
- Modify: `src/main.js` (current full contents reproduced below for reference; only lines 4, 6–9, 11–15, and 26 change)

Current `src/main.js`:

```js
let isScrolling = false;
let scrollTimer = null;
let altEnabled = true;
let rightClickEnabled = true;

chrome.storage.sync.get(['altWheelEnabled', 'rightClickWheelEnabled'], (cfg) => {
    altEnabled = cfg.altWheelEnabled ?? true;
    rightClickEnabled = cfg.rightClickWheelEnabled ?? true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if ('altWheelEnabled' in changes) altEnabled = changes.altWheelEnabled.newValue ?? true;
    if ('rightClickWheelEnabled' in changes) rightClickEnabled = changes.rightClickWheelEnabled.newValue ?? true;
});

window.addEventListener('wheel', function(e) {
    if (window !== window.top) return;
    if ((!e.altKey || !altEnabled) && (e.buttons !== 2 || !rightClickEnabled)) return;
    if (e.deltaY === 0) return;

    e.preventDefault();

    if (!isScrolling) {
        isScrolling = true;
        const direction = e.deltaY < 0 ? 'up' : 'down';
        chrome.runtime?.sendMessage({ direction, rightClick: e.buttons === 2 });
    }

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { isScrolling = false; }, 200);
}, { passive: false });
```

- [ ] **Step 1: Add `reverseEnabled` state variable**

In `src/main.js`, after the line `let rightClickEnabled = true;`, add:

```js
let reverseEnabled = false;
```

- [ ] **Step 2: Read the preference on startup**

Replace the existing `chrome.storage.sync.get(...)` call so it also reads the new key:

```js
chrome.storage.sync.get(['altWheelEnabled', 'rightClickWheelEnabled', 'reverseScrollDirection'], (cfg) => {
    altEnabled = cfg.altWheelEnabled ?? true;
    rightClickEnabled = cfg.rightClickWheelEnabled ?? true;
    reverseEnabled = cfg.reverseScrollDirection ?? false;
});
```

- [ ] **Step 3: React to live changes**

Inside the existing `chrome.storage.onChanged.addListener` callback, add one more line after the existing two `if (... in changes)` checks:

```js
if ('reverseScrollDirection' in changes) reverseEnabled = changes.reverseScrollDirection.newValue ?? false;
```

The full listener should now read:

```js
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if ('altWheelEnabled' in changes) altEnabled = changes.altWheelEnabled.newValue ?? true;
    if ('rightClickWheelEnabled' in changes) rightClickEnabled = changes.rightClickWheelEnabled.newValue ?? true;
    if ('reverseScrollDirection' in changes) reverseEnabled = changes.reverseScrollDirection.newValue ?? false;
});
```

- [ ] **Step 4: Apply XOR when computing direction**

Inside the `wheel` event listener, replace the line:

```js
const direction = e.deltaY < 0 ? 'up' : 'down';
```

with:

```js
const goingUp = e.deltaY < 0;
const direction = (goingUp !== reverseEnabled) ? 'up' : 'down';
```

Rationale: when `reverseEnabled` is `false`, the XOR collapses to the original mapping (`goingUp ? 'up' : 'down'`). When `true`, the mapping is inverted.

- [ ] **Step 5: Manual smoke test — default behavior unchanged**

1. Reload the extension at `chrome://extensions/`.
2. Open a window with at least 3 normal http(s) tabs.
3. In the popup, confirm *Reverse scroll direction* is unchecked.
4. On any normal page, hold Alt and scroll the wheel **up**. Expected: focus moves to the previous (left) tab.
5. Hold Alt and scroll **down**. Expected: focus moves to the next (right) tab.
6. Repeat steps 4–5 holding the **right mouse button** instead of Alt. Expected: same behavior; the context menu does not appear.

If any of the above fails, the change broke baseline behavior — stop and investigate before continuing.

- [ ] **Step 6: Manual smoke test — inverted behavior**

1. Open the popup and enable *Reverse scroll direction*. Leave the popup; the change should propagate via `storage.onChanged` without reloading the page.
2. On the same page from Step 5, hold Alt and scroll **up**. Expected: focus moves to the **next** (right) tab.
3. Hold Alt and scroll **down**. Expected: focus moves to the **previous** (left) tab.
4. Repeat with right-click+wheel. Expected: same inverted behavior; no context menu.
5. Combine with *Cyclic tab switching* enabled: on the rightmost tab, with inversion on, scroll up. Expected: wraps to the leftmost tab.
6. Disable *Reverse scroll direction* again and verify Step 5 from Task 2 still passes (live toggle off works).

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: reverse scroll direction option

Adds a popup toggle that swaps which wheel direction
activates the previous vs. next tab. Inversion is applied
in the content script via XOR; the message contract with
the service worker is unchanged."
```

---

## Done criteria

- [ ] Popup shows the new option under *Behavior*, after *Cyclic tab switching*.
- [ ] With the option off (default), Alt+wheel and right-click+wheel behave exactly as before.
- [ ] With the option on, both triggers switch tabs in the inverted direction.
- [ ] Toggling the option in the popup takes effect on already-open pages without reload.
- [ ] No changes to `src/popup.js` or `src/js/service-worker.js`.
- [ ] Two commits on the current branch: popup markup, then content-script logic.
