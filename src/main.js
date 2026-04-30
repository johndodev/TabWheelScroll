let isScrolling = false;
let scrollTimer = null;

window.addEventListener('wheel', function(e) {
    if (window !== window.top) return;
    if (!e.altKey && e.buttons !== 2) return;
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
