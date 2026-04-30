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
