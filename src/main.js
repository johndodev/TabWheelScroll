let isScrolling = false;
let scrollTimer = null;
let altEnabled = true;
let rightClickEnabled = true;
let deferredSwitchEnabled = false;
let altPreviewing = false;
let rightClickPreviewing = false;

chrome.storage.sync.get(['altWheelEnabled', 'rightClickWheelEnabled', 'deferredSwitchEnabled'], (cfg) => {
    altEnabled = cfg.altWheelEnabled ?? true;
    rightClickEnabled = cfg.rightClickWheelEnabled ?? true;
    deferredSwitchEnabled = cfg.deferredSwitchEnabled ?? false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if ('altWheelEnabled' in changes) altEnabled = changes.altWheelEnabled.newValue ?? true;
    if ('rightClickWheelEnabled' in changes) rightClickEnabled = changes.rightClickWheelEnabled.newValue ?? true;
    if ('deferredSwitchEnabled' in changes) deferredSwitchEnabled = changes.deferredSwitchEnabled.newValue ?? false;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt' && altEnabled && deferredSwitchEnabled && altPreviewing) {
        altPreviewing = false;
        chrome.runtime?.sendMessage({ action: 'confirm' });
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2 && rightClickEnabled && deferredSwitchEnabled && rightClickPreviewing) {
        e.preventDefault();
        rightClickPreviewing = false;
        // Suppress the contextmenu that fires synchronously after this mouseup,
        // before the service worker can inject into the source tab.
        window.addEventListener('contextmenu', (ce) => ce.preventDefault(), { once: true });
        chrome.runtime?.sendMessage({ action: 'confirm' });
    }
});

window.addEventListener('wheel', function(e) {
    if (window !== window.top) return;
    if ((!e.altKey || !altEnabled) && (e.buttons !== 2 || !rightClickEnabled)) return;
    if (e.deltaY === 0) return;

    e.preventDefault();

    if (!isScrolling) {
        isScrolling = true;
        const direction = e.deltaY < 0 ? 'up' : 'down';
        const rightClick = e.buttons === 2;

        if (deferredSwitchEnabled) {
            if (rightClick) rightClickPreviewing = true;
            else altPreviewing = true;
            chrome.runtime?.sendMessage({ action: 'preview', direction });
        } else {
            chrome.runtime?.sendMessage({ action: 'switch', direction, rightClick });
        }
    }

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { isScrolling = false; }, 200);
}, { passive: false });
