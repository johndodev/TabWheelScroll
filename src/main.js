/**
 * Send message to the server (to background.js)
 */
window.addEventListener('wheel', function(e) {
    // if alt or right click is pressed, we must scroll...
    if (e.altKey || e.buttons === 2) {
        // prevent the new active tab to actually scroll
        e.preventDefault();

        if (e.deltaY < 0) {
            chrome.runtime && chrome.runtime.sendMessage('up');
        } else if (e.deltaY > 0) {
            chrome.runtime && chrome.runtime.sendMessage('down');
        }
    }
}, { passive: false });
