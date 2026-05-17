# Reverse scroll direction — Design

## Goal

Add a user-configurable option that inverts the mapping between wheel direction and tab navigation. When enabled, scrolling up activates the next tab and scrolling down activates the previous tab.

## Current behavior

In `src/main.js`, the content script maps `deltaY` to a `direction` string:

- `e.deltaY < 0` (wheel up) → `'up'`
- `e.deltaY > 0` (wheel down) → `'down'`

The service worker (`src/js/service-worker.js`) translates that string to a delta:

- `'up'` → `delta = -1` (previous tab)
- `'down'` → `delta = +1` (next tab)

## Design

### Storage

- New key: `reverseScrollDirection` in `chrome.storage.sync`.
- Default: `false` (no migration needed; absence is treated as `false`).

### UI — `src/popup.html`

Add one checkbox to the existing *Behavior* section, after *Cyclic tab switching*:

- Input name: `reverseScrollDirection`
- Label: **Reverse scroll direction**
- Description: *Scroll up to go to the next tab, scroll down to go to the previous tab.*

No changes to `src/popup.js` — its generic `form.elements` loop already loads from and persists to `chrome.storage.sync` for any named checkbox.

### Logic — `src/main.js`

Track the preference alongside the existing `altEnabled` / `rightClickEnabled` state:

- Read `reverseScrollDirection` in the initial `chrome.storage.sync.get(...)` call.
- Update it in the `chrome.storage.onChanged` listener.

Apply inversion at the point where `direction` is computed:

```js
const goingUp = e.deltaY < 0;
const direction = (goingUp !== reverseScrollDirection) ? 'up' : 'down';
```

(XOR on booleans: when `reverseScrollDirection` is `false`, behavior is unchanged.)

### Service worker

No changes. The `'up'` / `'down'` message contract is preserved; inversion happens upstream in the content script.

## Decision: inversion lives in the content script

The service worker already reads one preference (`cyclicSwitchTab`), so either side could host the inversion. Putting it in the content script keeps the wheel-handling concerns (modifier keys, direction, debouncing) co-located and avoids an extra `chrome.storage` read on every tab-switch message.

## Out of scope (YAGNI)

- No per-trigger setting (separate inversion for Alt vs right-click).
- No keyboard shortcut to toggle.
- No popup default entry — `cyclicSwitchTab` already establishes the precedent that an absent boolean equals `false`.

## Manual test plan

1. Load the unpacked extension. Confirm default behavior: Alt+wheel-up → previous tab, Alt+wheel-down → next tab.
2. Open the popup, enable *Reverse scroll direction*. Confirm: Alt+wheel-up → next tab, Alt+wheel-down → previous tab.
3. Same checks with right-click+wheel.
4. Toggle the option off again; confirm original behavior is restored without reloading the page (storage-change listener path).
5. Combine with *Cyclic tab switching* on a 3-tab window and verify wrap-around works in both directions under inversion.
